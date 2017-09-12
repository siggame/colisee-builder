export type BuildStatus = "queued" | "building" | "failed" | "succeeded";

export interface BuildSubmission {
    id: string;
    status: BuildStatus;
    context?: ReadableStream;
    startedTime: Date;
    finishedTime?: Date;
}

export interface IBuilderOptions {
    queueLimit: number;
}

export class Builder {
    private submissions: BuildSubmission[];
    private queueLimit: number;

    constructor({ queueLimit }: IBuilderOptions) {
        this.queueLimit = queueLimit;
        this.submissions = [];
    }
}
