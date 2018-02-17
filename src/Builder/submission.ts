import { db } from "@siggame/colisee-lib";

export interface IBuildSubmission extends db.Submission {
    context: NodeJS.ReadableStream;
}
