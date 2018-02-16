import { db } from "@siggame/colisee-lib";
import * as Docker from "dockerode";
import * as fs from "fs";
import { Deque } from "tstl";
import * as winston from "winston";
import * as zlib from "zlib";

import { BUILD_INTERVAL, BUILD_LIMIT, OUTPUT_DIR, REGISTRY_URL } from "./vars";

type BuildStatus = "queued" | "building" | "failed" | "finished";

interface IBuildSubmission {
    context: NodeJS.ReadableStream;
    finishedTime?: Date;
    id: number;
    startedTime: Date;
    status: BuildStatus;
    tag: string;
}

interface IBuilderOptions {
    buildInterval: number;
    buildLimit: number;
    output: string;
    registry: string;
}

type BuildQueue = Deque<IBuildSubmission>;

/**
 * Queues build submissions and builds them.
 * 
 * @class Builder
 */
class Builder {
    public submissions: Map<string, BuildQueue>;
    private docker: Docker;
    private opts: IBuilderOptions;
    private runTimer: NodeJS.Timer | undefined;

    /**
     * Creates an instance of Builder.
     * @param {IBuilderOptions} [opts={ buildInterval: BUILD_INTERVAL, queueLimit: BUILD_LIMIT, registry: REGISTRY_URL }] 
     * @memberof Builder
     */
    constructor(opts: IBuilderOptions = {
        buildInterval: BUILD_INTERVAL, buildLimit: BUILD_LIMIT,
        output: OUTPUT_DIR, registry: REGISTRY_URL,
    }) {
        this.docker = new Docker();
        this.opts = opts;
        this.submissions = new Map<string, BuildQueue>();
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
                    if (queue.size() > 0 && (queue.front().status === "finished" || queue.front().status === "failed")) {
                        queue.pop_front();
                    }
                });
                // count currently building submissions
                const building = Array.from(this.submissions.values())
                    .reduce((count, queue) =>
                        (queue.size() > 0 && queue.front().status === "building") ? count + 1 : count,
                        0);
                // invoke build on queued builds if below bulid limit
                if (building < this.opts.buildLimit) {
                    Array.from(this.submissions.entries())
                        .filter(([, queue]) => queue.size() > 0 && queue.front().status === "queued")
                        .sort(([, [subA]], [, [subB]]) => subA.startedTime.getTime() - subB.startedTime.getTime())
                        .slice(0, this.opts.buildLimit - building)
                        .forEach(([id]) => {
                            this.build(id);
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
    private async build(id: string): Promise<void> {
        const queue = this.submissions.get(id);

        if (queue == null || queue.size() === 0) {
            winston.error(`No submissions for team ${id}`);
        } else {
            const submission = queue.front();

            const handleError = async (error: any) => {
                submission.status = "failed";
                await db.connection("submissions").update({ status: submission.status }).where({ id: submission.id });
                winston.error(error);
            };

            let buildOutput: NodeJS.ReadableStream | undefined;
            const imageName = `${this.opts.registry}/team_${submission.id}:${submission.tag}`;
            try {
                buildOutput = await this.docker.buildImage(submission.context, { t: imageName });
            } catch (error) {
                submission.status = "failed";
                await db.connection("submissions").update({ status: submission.status }).where({ id: submission.id });
                winston.error(error);
            }
            submission.status = "building";
            await db.connection("submissions").update({ status: submission.status }).where({ id: submission.id });
            if (buildOutput) {
                const writeBuildOutput = fs.createWriteStream(`${this.opts.output}/team_${submission.id}_${submission.tag}.log.gz`);
                const compressor = zlib.createGzip();
                buildOutput.pipe(compressor, { end: false }).pipe(writeBuildOutput);

                buildOutput.on("error", handleError);
                buildOutput.on("end", async () => {
                    winston.info(`successfully built ${imageName}`);

                    const image = await this.docker.getImage(imageName);
                    const pushOutput = await image.push({ "X-Registry-Auth": JSON.stringify({ serveraddress: this.opts.registry }) });
                    pushOutput.pipe(compressor).pipe(writeBuildOutput);

                    pushOutput.on("error", handleError);
                    pushOutput.on("end", async () => {
                        submission.status = "finished";
                        await db.connection("submissions").update({
                            image_name: imageName,
                            status: submission.status,
                        }).where({ id: submission.id });
                        winston.info(`successfully pushed ${submission.tag}`);
                    });
                });
            }
        }
    }

    public async enqueue(id: string, submission: IBuildSubmission): Promise<void> {
        const queue = this.submissions.get(id);
        if (queue == null) {
            this.submissions.set(id, new Deque<IBuildSubmission>(1, submission));
        } else {
            queue.push_back(submission);
        }
    }
}

export const builder = new Builder();
