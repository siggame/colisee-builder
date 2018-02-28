import * as admZip from "adm-zip";
import * as fileType from "file-type";
import { Readable } from "stream";
import * as tar from "tar-stream";
import * as zlib from "zlib";

interface IPacker extends Readable {
    _read(n: number): void;
    entry(opts: { name: string, type: string }, data: Buffer): void;
    finalize(): void;
}

/**
 * Create a ReadableStream of a Buffer containing `.tar` 
 * from a Buffer containing `.gz` | `.tar` | `.zip`
 * 
 * @export
 * @param buffer `.gz`, `.tar`, or `.zip` buffer
 */
export function ReadableContext(buffer: Buffer): Readable {
    const { ext } = fileType(buffer);
    if (ext === "zip") {
        return zipToTarStream(buffer);
    } else if (ext === "gz") {
        return buffer_to_readable(buffer).pipe(zlib.createGunzip());
    } else {
        return buffer_to_readable(buffer);
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

function buffer_to_readable(buffer: Buffer) {
    const context_stream = new Readable();
    context_stream.push(buffer);
    context_stream.push(null);
    return context_stream;
}
