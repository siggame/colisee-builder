import * as Docker from "dockerode";
import * as fs from "fs";
import { basename } from "path";
import { PassThrough } from "stream";
import * as winston from "winston";
import * as zlib from "zlib";

import { updateStatus, updateSubmission } from "../db";
import { Registry } from "../Registry";
import { BUILD_INTERVAL, BUILD_LIMIT, OUTPUT_DIR, REGISTRY_HOST_EXTERNAL, REGISTRY_HOST_INTERNAL, REGISTRY_PORT } from "../vars";
import { BuildQueue } from "./queue";
import { IBuildSubmission } from "./submission";

interface IBuilderOptions {
    buildInterval: number;
    buildLimit: number;
    docker_options?: Docker.DockerOptions;
    output: string;
    registry: { internal: string, external: string };
}

/**
 * Queues build submissions and builds them.
 * 
 * @class Builder
 */
class Builder extends Docker {
    public submissions: BuildQueue;
    private opts: IBuilderOptions;
    private registry: Registry;
    private runTimer?: NodeJS.Timer;

    /**
     * Creates an instance of Builder.
     // tslint:disable-next-line:max-line-length
     * @param {IBuilderOptions} [opts={ 
     * buildInterval: BUILD_INTERVAL, 
     * queueLimit: BUILD_LIMIT, 
     * registry: {
     *     external: `${REGISTRY_HOST_EXTERNAL}:${REGISTRY_PORT}`,
     *     internal: `${REGISTRY_HOST_INTERNAL}:${REGISTRY_PORT}`,
     * }}] 
     * @memberof Builder
     */
    constructor(opts: IBuilderOptions = {
        buildInterval: BUILD_INTERVAL,
        buildLimit: BUILD_LIMIT,
        output: OUTPUT_DIR,
        registry: {
            external: `${REGISTRY_HOST_EXTERNAL}:${REGISTRY_PORT}`,
            internal: `${REGISTRY_HOST_INTERNAL}:${REGISTRY_PORT}`,
        },
    }) {
        if (opts.docker_options) {
            super(opts.docker_options);
        } else {
            super();
        }
        this.opts = opts;
        this.registry = new Registry(`${this.opts.registry.internal}`);
        this.submissions = new BuildQueue();
    }

    /**
     * Initiate processing of queued build submissions. Limits
     * building submissions by `opts.queueLimit`. Updates every
     * `opts.buildInterval`.
     * 
     * @memberof Builder
     */
    public start() {
        if (this.runTimer == null) {
            this.runTimer = setInterval(() => {
                // let queue make progress
                this.submissions.forEach((queue) => {
                    if (!queue.empty() && (queue.front().status === "finished" || queue.front().status === "failed")) {
                        queue.pop_front();
                    }
                });
                // count currently building submissions
                const building = Array.from(this.submissions.values())
                    .reduce((count, queue) =>
                        (!queue.empty() && queue.front().status === "building") ? count + 1 : count,
                        0);
                // invoke build on queued builds if below bulid limit
                if (building < this.opts.buildLimit) {
                    Array.from(this.submissions.entries())
                        .filter(([, queue]) => !queue.empty() && queue.front().status === "queued")
                        .sort(([, queue_a], [, queue_b]) => queue_a.front().createdAt.getTime() - queue_b.front().createdAt.getTime())
                        .slice(0, this.opts.buildLimit - building)
                        .forEach(async ([, queue]) => {
                            const submission = queue.front();
                            submission.status = "building";
                            await updateStatus(submission);
                            const compressor = new PassThrough();
                            const log = fs.createWriteStream(`${this.opts.output}/team_${submission.teamId}_${submission.version}.log.gz`);
                            compressor.pipe(zlib.createGzip()).pipe(log);
                            await this.construct(submission, compressor)
                                .catch((error) => {
                                    submission.status = "failed";
                                    updateSubmission(submission);
                                    winston.error(error);
                                    compressor.write(JSON.stringify(error));
                                    compressor.end();
                                });
                        });

                }
            }, this.opts.buildInterval);
        }
    }

    /**
     * Stop the builder from building new submissions.
     * 
     * @memberof Builder
     */
    public stop() {
        if (this.runTimer) {
            clearInterval(this.runTimer);
            this.runTimer = undefined;
        }
    }

    /**
     * Builds a submission if it exists. Sends submission context to
     * docker engine to be built and once the build succeeds the image
     * is pushed to a registry at `opts.registry`.
     * 
     * @private
     * @param id Team id for the build.
     * @memberof Builder
     */
    private async construct(submission: IBuildSubmission, output: PassThrough): Promise<void> {
        const imageName = `${this.opts.registry.external}/team_${submission.teamId}:${submission.version}`;
        submission.logUrl = `/builder/${basename(this.opts.output)}/team_${submission.teamId}_${submission.version}.log.gz`;
        const buildOutput = await this.buildImage(submission.context, { t: imageName })
            .catch((error) => {
                winston.error("build submission to docker failed");
                throw error;
            });
        buildOutput.pipe(output, { end: false });

        await new Promise((res, rej) => { buildOutput.on("end", res).on("error", rej); })
            .catch((error) => { winston.error("build of image failed"); throw error; });

        winston.info(`successfully built ${imageName}`);

        const image = await this.getImage(imageName);
        const pushOutput = await image.push({ "X-Registry-Auth": JSON.stringify({ serveraddress: this.opts.registry.external }) })
            .catch((error) => {
                winston.error(`attempt to push ${imageName} failed`);
                throw error;
            });
        pushOutput.pipe(output, { end: false });

        await new Promise((res, rej) => { pushOutput.on("end", res).on("error", rej); })
            .catch((error) => {
                winston.error(`pushing ${imageName} failed`);
                throw error;
            });

        const images = await this.registry.getTeamTags(submission.teamId);

        if (images.tags && images.tags.some((tag) => tag === `${submission.version}`)) {
            submission.status = "finished";
            submission.imageName = imageName;
            await updateSubmission(submission);
            winston.info(`successfully pushed ${submission.imageName}`);
            output.write(`successfully pushed ${submission.imageName}`);
            output.end();
        } else if (images.errors) {
            throw new Error(`${images.errors}`);
        } else {
            throw new Error(`failed to push image ${imageName}`);
        }
    }
}

export const builder = new Builder();
