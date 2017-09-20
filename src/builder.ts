import { db } from "@siggame/colisee-lib";
import * as Docker from "dockerode";
import * as winston from "winston";

import { BUILD_INTERVAL, BUILD_LIMIT, REGISTRY_URL } from "./vars";

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
    queueLimit: number;
    registry: string;
}

class Builder {
    public submissions: Map<string, IBuildSubmission>;
    private docker: Docker;
    private opts: IBuilderOptions;
    private runTimer: NodeJS.Timer | undefined;

    constructor(opts: IBuilderOptions = { buildInterval: BUILD_INTERVAL, queueLimit: BUILD_LIMIT, registry: REGISTRY_URL }) {
        this.docker = new Docker();
        this.opts = opts;
        this.submissions = new Map<string, IBuildSubmission>();
    }

    public run() {
        if (this.runTimer == null) {
            this.runTimer = setInterval(() => {
                const building = Array.from(this.submissions.values())
                    .reduce((count, submission) =>
                        submission.status === "building" ? count + 1 : count,
                    0);
                if (building < this.opts.queueLimit) {
                    Array.from(this.submissions.entries())
                        .filter(([, submission]) => submission.status === "queued")
                        .sort(([, subA], [, subB]) => subA.startedTime.getTime() - subB.startedTime.getTime())
                        .slice(0, this.opts.queueLimit - building)
                        .forEach(([id]) => {
                            this.build(id);
                        });
                }
            }, this.opts.buildInterval);
        }
    }

    public stop() {
        if (this.runTimer) {
            clearInterval(this.runTimer);
            this.runTimer = undefined;
        }
    }

    private async build(name: string) {
        const submission = this.submissions.get(name);
        if (submission) {
            const buildOutput: NodeJS.ReadableStream = await this.docker.buildImage(submission.context, { t: `${submission.tag}` });
            // pipe build ouptut to log file or remote storage
            submission.status = "building";
            await db.connection("submissions").update({ status: submission.status }).where({ id: submission.id });
            buildOutput.pipe(process.stdout);
            buildOutput.on("error", async (error: any) => {
                submission.status = "failed";
                await db.connection("submissions").update({ status: submission.status }).where({ id: submission.id });
                winston.error(error);
            });
            buildOutput.on("end", async () => {
                winston.info(`successfully built ${submission.tag}`);
                const image = await this.docker.getImage(submission.tag);
                const pushOutput = await image.push({ "X-Registry-Auth": JSON.stringify({ serveraddress: this.opts.registry }) });
                pushOutput.on("data", async (data: Buffer) => {
                    const fields = JSON.parse(data.toString("utf-8"));
                    if (fields.error) {
                        pushOutput.emit("error", fields.error);
                        pushOutput.removeAllListeners();
                    }
                });
                pushOutput.on("error", async (error) => {
                    submission.status = "failed";
                    await db.connection("submissions").update({ status: submission.status }).where({ id: submission.id });
                    winston.error(error);
                });
                pushOutput.on("end", async () => {
                    submission.status = "finished";
                    await db.connection("submissions").update({ status: submission.status }).where({ id: submission.id });
                    winston.info(`successfully pushed ${submission.tag}`);
                });
            });
        } else {
            winston.error(`No submission named ${name} `);
        }
    }
}

export const builder = new Builder();
