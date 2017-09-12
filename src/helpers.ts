import * as admZip from "adm-zip";
import * as fileType from "file-type";
import { noop } from "lodash";
import { Readable } from "stream";
import * as tar from "tar-stream";
import * as zlib from "zlib";

interface IPacker extends Readable {
    _read(n: number): void;
    entry(opts: { name: string, type: string }, data: Buffer): void;
    finalize(): void;
}

export function createReadableTarStream(buffer: Buffer) {
    const { ext } = fileType(buffer);
    if (ext === "zip") {
        return zipToTarStream(buffer);
    } else if (ext === "gz") {
        return makeReadableStream((stream) => {
            zlib.gunzip(buffer, (err, tar) => {
                stream.push(tar);
                stream.push(null);
            });
        });
    } else {
        return makeReadableStream((stream) => {
            stream.push(buffer);
            stream.push(null);
        });
    }
}

function zipToTarStream(buffer: Buffer) {
    const zip = new admZip(buffer);
    const packer: IPacker = tar.pack();
    // NOTE: some meta data is lost during conversion and 
    // the file size may not be 1:1 (when compared to .tar archive made by other tools)
    zip.getEntries().forEach((entry) => {
        packer.entry({ name: entry.entryName, type: entry.isDirectory ? "directory" : "file" }, entry.getData());
    });
    packer.finalize();
    return packer;
}

function makeReadableStream(cb?: (stream: Readable) => void) {
    const contextStream = new Readable();
    contextStream._read = noop;
    if (cb) {
        cb(contextStream);
    }
    return contextStream;
}

export function catchError<T>(fn: (...args: any[]) => Promise<T>) {
    return async (...args: any[]) => fn(...args).catch(args[2]);
}
