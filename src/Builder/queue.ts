import { Deque } from "tstl";

import { IBuildSubmission } from "./submission";

export class BuildQueue extends Map<number, Deque<IBuildSubmission>> {

    constructor() {
        super();
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
