import "core-js/modules/es7.symbol.async-iterator";

import { db } from "@siggame/colisee-lib";
import * as Docker from "dockerode";
import { basename } from "path";
import { Readable } from "stream";
import * as winston from "winston";

import { updateStatus, updateSubmission } from "../db";
import { Registry } from "../Registry";
import { BUILD_LIMIT, DOCKER_HOST, DOCKER_PORT, OUTPUT_DIR, REGISTRY_HOST, REGISTRY_PORT } from "../vars";
import { BuildQueue } from "./queue";
import { IBuildSubmission, SubmissionImage } from "./submission";

class Builder {

    private docker_options: Docker.DockerOptions;
    private pulling: boolean;
    private queue: BuildQueue;
    private registry: Registry;
    private stream?: Promise<void>;

    constructor() {
        this.docker_options = DOCKER_HOST !== "" ? { host: DOCKER_HOST, port: DOCKER_PORT } : {};
        this.pulling = false;
        this.queue = new BuildQueue(BUILD_LIMIT);
        this.registry = new Registry(REGISTRY_HOST, REGISTRY_PORT);
    }

    public enqueue(meta_data: db.Submission, context: Readable) {
        meta_data.imageName = `${this.registry.url}/team_${meta_data.teamId}:${meta_data.version}`;
        const filename = `team_${meta_data.teamId}_${meta_data.version}.log.gz`;
        meta_data.logUrl = `/builder/${basename(OUTPUT_DIR)}/${filename}`;
        this.queue.push_back({
            image: new SubmissionImage(meta_data, context, this.docker_options, `${OUTPUT_DIR}/${filename}`),
            meta_data,
        });
    }

    public start() {
        if (this.stream == null) {
            this.stream = this.pull();
            this.pulling = true;
        }
    }

    public async stop() {
        if (this.stream && this.pulling) {
            this.pulling = false;
            await this.stream;
            this.stream = undefined;
        }
    }

    private async pull() {
        for await (const submission of this.queue.stream()) {
            // construction executes asynchronously, so it has to release when finished
            this.queue.hold();
            winston.info(`building submission ${submission.meta_data.id} for team ${submission.meta_data.teamId}`);
            (async () => {
                try {
                    await this.construct(submission);
                } finally {
                    this.queue.release();
                }
            })();
            if (!this.pulling) { break; }
        }
        winston.info("stopped pulling enqueued builds");
    }

    private async construct({ image, meta_data }: IBuildSubmission): Promise<void> {
        try {
            meta_data.status = "building";
            await updateStatus(meta_data);
            await image.build();
            await image.push(this.registry.auth);
            await image.verify(this.registry, meta_data);
            image.end_log();
            meta_data.status = "finished";
            await updateSubmission(meta_data);
        } catch (error) {
            winston.error(`failed to construct submission ${meta_data.id}`);
            meta_data.status = "failed";
            await updateSubmission(meta_data);
        }
    }
}

export const builder = new Builder();
