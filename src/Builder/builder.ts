import * as Docker from "dockerode";
import * as fs from "fs";
import { basename } from "path";
import * as request from "request-promise-native";

import * as winston from "winston";
import * as zlib from "zlib";

import { updateStatus, updateSubmission } from "../db";
import { BUILD_INTERVAL, BUILD_LIMIT, OUTPUT_DIR, REGISTRY_HOST, REGISTRY_PORT } from "../vars";
import { BuildQueue } from "./queue";
import { IBuildSubmission } from "./submission";

interface IBuilderOptions {
    buildInterval: number;
    buildLimit: number;
    output: string;
    registry: string;
}

/**
 * Queues build submissions and builds them.
 * 
 * @class Builder
 */
class Builder {
    public submissions: BuildQueue;
    private docker: Docker;
    private opts: IBuilderOptions;
    private runTimer: NodeJS.Timer | undefined;

    /**
     * Creates an instance of Builder.
     // tslint:disable-next-line:max-line-length
     * @param {IBuilderOptions} [opts={ buildInterval: BUILD_INTERVAL, queueLimit: BUILD_LIMIT, registry: `${REGISTRY_HOST}:${REGISTRY_PORT}` }] 
     * @memberof Builder
     */
    constructor(opts: IBuilderOptions = {
        buildInterval: BUILD_INTERVAL, buildLimit: BUILD_LIMIT,
        output: OUTPUT_DIR, registry: `${REGISTRY_HOST}:${REGISTRY_PORT}`,
    }) {
        this.docker = new Docker();
        this.opts = opts;
        this.submissions = new BuildQueue();
    }

    /**
     * Initiate processing of queued build submissions. Limits
     * building submissions by `opts.queueLimit`. Updates every
     * `opts.buildInterval`.
     * 
     * @memberof Builder
     */
    public run(): void {
        if (this.runTimer == null) {
            this.runTimer = setInterval(() => {
                // let queue make progress
                this.submissions.forEach((queue, _) => {
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
                        .sort(([, [subA]], [, [subB]]) => subA.createdAt.getTime() - subB.createdAt.getTime())
                        .slice(0, this.opts.buildLimit - building)
                        .forEach(async ([id]) => {
                            const submission = await this.submissions.build(id);
                            await this.construct(submission).catch(async (error) => {
                                submission.status = "failed";
                                await updateStatus(submission);
                                winston.error(error);
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
    public stop(): void {
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
    private async construct(submission: IBuildSubmission): Promise<void> {
        submission.imageName = `${this.opts.registry}/team_${submission.teamId}:${submission.version}`;
        submission.logUrl = `/builder/${basename(this.opts.output)}/team_${submission.teamId}_${submission.version}.log.gz`;
        const buildOutput = await this.docker.buildImage(submission.context, { t: submission.imageName })
            .catch((error) => { throw error; });
        const writeBuildOutput = fs.createWriteStream(`${this.opts.output}/team_${submission.teamId}_${submission.version}.log.gz`);
        const compressor = zlib.createGzip();
        buildOutput.pipe(compressor, { end: false }).pipe(writeBuildOutput);

        await new Promise((res, rej) => { buildOutput.on("end", res).on("error", rej); })
            .catch((error) => { throw error; });

        winston.info(`successfully built ${submission.imageName}`);

        const image = await this.docker.getImage(submission.imageName);
        const pushOutput = await image.push({ "X-Registry-Auth": JSON.stringify({ serveraddress: this.opts.registry }) })
            .catch((error) => { throw error; });
        pushOutput.pipe(compressor).pipe(writeBuildOutput);

        await new Promise((res, rej) => { pushOutput.on("end", res).on("error", rej); })
            .catch((error) => { throw error; });

        /* https://docs.docker.com/registry/spec/api/ */
        const images = await request({
            json: true, url: `http://${this.opts.registry}/v2/team_${submission.teamId}/tags/list`,
        }).catch((error) => { throw error; });

        if (images.tags && (<Array<string>>images.tags).indexOf(`${submission.version}`) >= 0) {
            submission.status = "finished";
            await updateSubmission(submission);
            winston.info(`successfully pushed ${submission.imageName}`);
        } else if (images.errors) {
            throw new Error(`${images.errors}`);
        } else {
            throw new Error(`failed to push image ${submission.imageName}`);
        }
    }
}

export const builder = new Builder();
