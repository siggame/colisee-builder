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
