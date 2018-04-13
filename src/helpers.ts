import { EventEmitter } from "events";

export function delay(ms: number) {
    return new Promise<void>((res, rej) => { setTimeout(res, ms); });
}

export async function retry<T>(fn: () => Promise<T>, attempts: number = 5) {
    while (attempts--) {
        try {
            return await fn();
        } catch (_) {
            await delay(100);
        }
    }
    throw new Error("max attempts reached");
}

export async function await_event(listener: EventEmitter, resolve_event: string = "end", reject_event: string = "error") {
    return new Promise<void>((res, rej) => {
        listener.once(resolve_event, res);
        listener.once(reject_event, rej);
    });
}
