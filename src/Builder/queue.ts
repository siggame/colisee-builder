import { Deque } from "tstl";

import { updateStatus } from "../db";
import { IBuildSubmission } from "./submission";

export class BuildQueue extends Map<number, Deque<IBuildSubmission>> {

    constructor() {
        super();
    }

    public async build(id: number) {
        const queue = this.get(id);

        if (queue && !queue.empty()) {
            const submission = queue.front();
            submission.status = "building";
            await updateStatus(submission);
            queue.pop_front();
            return submission;
        } else {
            throw new Error(`No submission available for ${id}`);
        }
    }

    /**
     * enqueue
     */
    public enqueue(id: number, submission: IBuildSubmission) {
        const queue = this.get(id);
        if (queue == null) {
            this.set(id, new Deque<IBuildSubmission>(1, submission));
        } else {
            queue.push_back(submission);
        }
    }
}
