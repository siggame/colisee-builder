import * as admZip from "adm-zip";
import * as fileType from "file-type";
import * as _ from "lodash";
import { Readable } from "stream";
import * as tar from "tar-stream";
import * as winston from "winston";
import * as zlib from "zlib";

interface IPacker extends Readable {
    _read(n: number): void;
    entry(opts: { name: string, type: string }, data: Buffer): void;
    finalize(): void;
}

export async function createReadableTarStream(buffer: Buffer): Promise<Readable> {
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

async function zipToTarStream(buffer: Buffer): Promise<Readable> {
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
    contextStream._read = _.noop;
    if (cb) {
        cb(contextStream);
    }
    return contextStream;
}
