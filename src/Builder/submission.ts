import { db } from "@siggame/colisee-lib";
import * as Docker from "dockerode";
import { createWriteStream } from "fs";
import { Readable, Writable } from "stream";
import * as winston from "winston";
import { createGzip } from "zlib";

import { await_event } from "../helpers";
import { Registry, RegistryAuth } from "../Registry";

interface IBuildOptions {
    t: string;
}

export interface IBuildSubmission {
    image: SubmissionImage;
    meta_data: db.Submission;
}

export class SubmissionImage {

    private build_options: IBuildOptions;
    private docker: Docker;
    private log: Writable;

    constructor(
        { imageName, teamId }: db.Submission,
        private context: Readable,
        docker_options: Docker.DockerOptions,
        log_path: string,
    ) {
        if (imageName) {
            this.build_options = { t: imageName };
        } else {
            throw new Error(`image name for team ${teamId} not provided`);
        }
        if (log_path !== "") {
            this.log = createGzip().pipe(createWriteStream(log_path));
        } else {
            throw new Error(`log path for team ${teamId} not provided`);
        }
        this.docker = new Docker(docker_options);
    }

    public async build() {
        try {
            const build_output = await this.docker.buildImage(this.context, this.build_options);
            build_output.pipe(this.log, { end: false });
            await await_event(build_output, "end", "error");
        } catch (error) {
            winston.error(`build for submission ${this.build_options.t} failed`);
            this.log.write("\n\n>>>>>>FAILED BUILD<<<<<<\n\n");
            this.log.write(`${JSON.stringify(error)}`);
            this.log.end();
            throw error;
        }
    }

    public async push(auth: RegistryAuth) {
        try {
            const image = await this.docker.getImage(this.build_options.t);
            const push_output = await image.push(auth);
            push_output.pipe(this.log, { end: false });
            await await_event(push_output, "end", "error");
        } catch (error) {
            winston.error(`push for image ${this.build_options.t} failed`);
            this.log.write("\n\n>>>>>>FAILED PUSH<<<<<<\n\n");
            this.log.write(`${JSON.stringify(error)}`);
            this.log.end();
            throw error;
        }
    }

    public async verify(registry: Registry, { teamId, version }: db.Submission) {
        try {
            await registry.verify_push(teamId, version);
            this.log.write("\n\npush successful");
        } catch (error) {
            winston.error(`verification for push of image ${this.build_options.t} failed`);
            this.log.write("\n\n>>>>>>FAILED VERIFY<<<<<<\n\n");
            this.log.write(`${JSON.stringify(error)}`);
            this.log.end();
            throw error;
        }
    }

    public end_log() { this.log.end(); }
}
