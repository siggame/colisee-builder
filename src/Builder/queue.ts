import "core-js/modules/es7.symbol.async-iterator";
import { Deque } from "tstl";

import { delay } from "../helpers";
import { IBuildSubmission } from "./submission";

export class BuildQueue extends Deque<IBuildSubmission> {

    private held: number;

    constructor(private limit: number) {
        super();
        this.held = 0;
    }

    public hold() { this.held++; }
    public release() { this.held--; }

    public async *stream() {
        while (true) {
            if (this.limit > this.held && !this.empty()) {
                yield this.front();
                this.pop_front();
            } else {
                await delay(100);
            }
        }
    }
}
