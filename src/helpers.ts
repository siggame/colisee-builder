/**
 * Pass errors thrown by fn to the 3rd callback
 * (eg. catchError<RequestHandler>((req, res, next) => { throw new Error("test"); }); )
 * 
 * @export
 * @param fn Function to be wrapped with catch handler added
 */
export function catchError<T extends Function>(fn: T) {
    return async (...args: any[]) => fn(...args).catch(args[2]);
}

function delay(ms: number) {
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
