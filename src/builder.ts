import { db } from "@siggame/colisee-lib";
import * as Docker from "dockerode";
import * as winston from "winston";

import { REGISTRY_URL } from "./vars";

export type BuildStatus = "queued" | "building" | "failed" | "finished";

export interface IBuildSubmission {
    context: NodeJS.ReadableStream;
    finishedTime?: Date;
    id: number;
    startedTime: Date;
    status: BuildStatus;
    tag: string;
}

export interface IBuilderOptions {
    queueLimit: number;
}

export class Builder {
    public submissions: Map<string, IBuildSubmission>;
    private docker: Docker;
    private queueLimit: number;

    constructor({ queueLimit }: IBuilderOptions) {
        this.docker = new Docker();
        this.queueLimit = queueLimit;
        this.submissions = new Map<string, IBuildSubmission>();
    }

    async build(name: string) {
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
                const pushOutput = await image.push({ "X-Registry-Auth": JSON.stringify({ serveraddress: REGISTRY_URL }) });
                // pipe push response to log file or remote storage
                pushOutput.pipe(process.stdout);
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
