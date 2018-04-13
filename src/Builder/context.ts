import * as adm_zip from "adm-zip";
import { exec } from "child_process";
import * as fileType from "file-type";
import * as fs from "fs";
import { Readable, ReadableOptions, Writable } from "stream";
import * as tar from "tar-stream";
import { promisify } from "util";
import * as winston from "winston";
import * as zlib from "zlib";

import { JOUEUR_DOCKERFILES } from "../vars";

const async_exec = promisify(exec);

interface IPackerHeader {
    gid: number;
    name: string;
    size: number;
    type: string;
    uid: number;
}

interface IPacker extends Readable {
    _read(n: number): void;
    entry(opts: IPackerHeader, data: Buffer): void;
    finalize(): void;
}

function mkdtemp(prefix: string) {
    return new Promise<string>((res, rej) => {
        fs.mkdtemp(prefix, (error, folder) => {
            if (error) {
                rej(error);
            } else {
                res(folder);
            }
        });
    });
}

function copy_file(src: fs.PathLike, dest: fs.PathLike) {
    return new Promise<void>((res, rej) => {
        fs.copyFile(src, dest, (error) => {
            if (error) {
                rej(error);
            } else {
                res();
            }
        });
    });
}

function finish_write(writable: Writable) {
    return new Promise<void>((res, rej) => {
        let resolved = false;
        writable.once("error", rej);
        writable.once("end", () => { if (!resolved) { res(); resolved = true; } });
        writable.once("close", () => { if (!resolved) { res(); resolved = true; } });
    });
}

function rm_rf(...paths: string[]) {
    return async_exec(["rm", "-rf", ...paths].join(" "));
}

function tar_extract(output: string) {
    return async_exec(["tar", "xf", `${output}.tar`, "-C", `${output}`].join(" "));
}

function tar_create(src: string, opts: { gz: boolean } = { gz: false }) {
    const tar_flags = opts.gz ? "cz" : "c";
    return async_exec(["tar", tar_flags, "-C", `${src}`, "."].join(" "),
        { encoding: "buffer", maxBuffer: 150 * 1024 * 1024 });
}

/**
 * Create a ReadableStream of a Buffer containing `.tar` 
 * from a Buffer containing `.gz` | `.tar` | `.zip`
 * 
 * @export
 * @param buffer `.gz`, `.tar`, or `.zip` buffer
 */
export async function readable_context(buffer: Buffer): Promise<Readable> {
    const { ext } = fileType(buffer);
    switch (ext) {
        case "gz":
            return buffer_to_readable(await unzip(buffer));
        case "zip":
            return zip_to_tar_stream(buffer);
        default:
            return buffer_to_readable(buffer);
    }
}

function zip_to_tar_stream(buffer: Buffer) {
    const zip = new adm_zip(buffer);
    const packer: IPacker = tar.pack();
    const gid = process.getgid();
    const uid = process.getuid();
    // NOTE: some meta data is lost during conversion and 
    // the file size may not be 1:1 (when compared to .tar archive made by other tools)
    zip.getEntries().forEach((entry) => {
        const buffer = entry.getData();
        const header: IPackerHeader = {
            gid,
            name: entry.entryName,
            size: buffer.length,
            type: "file",
            uid,
        };
        if (entry.isDirectory) {
            header.size = 0;
            header.type = "directory";
        }
        packer.entry(header, buffer);
    });
    packer.finalize();
    return packer;
}

async function unzip(buffer: Buffer) {
    return new Promise<Buffer>((res, rej) => {
        zlib.unzip(buffer, (error, result) => {
            if (error) {
                rej(error);
            } else {
                res(result);
            }
        });
    });
}

class BufferReadable extends Readable {
    private buffer: Buffer;
    private destroyed: boolean;
    private offset: number;
    constructor(buffer: Buffer, opts: ReadableOptions = { highWaterMark: 64 * 1024 }) {
        super(opts);
        this.buffer = buffer.slice(0, buffer.length);
        this.destroyed = false;
        this.offset = 0;
        this.once("end", () => {
            this.destroy();
        });
    }

    public _read(size?: number) {
        if (this.offset < 0) { return; }
        if (size) {
            this.push(this.buffer.slice(this.offset, this.offset + size));
            this.offset += size;
        } else {
            this.push(this.buffer.slice(this.offset, this.offset + this.readableHighWaterMark));
            this.offset += this.readableHighWaterMark;
        }
        if (this.offset >= this.buffer.length) {
            this.push(null);
            this.offset = -1;
        }
    }

    public _destroy(error: Error, callback: (error: Error) => any) {
        if (this.destroyed) { return; }
        delete this.buffer;
        this.destroyed = true;
        if (error) {
            this.emit("error", error);
        }
        if (error && callback) {
            callback(error);
        }
        this.emit("closed");
    }
}

function buffer_to_readable(buffer: Buffer, opts?: ReadableOptions) {
    if (opts) {
        return new BufferReadable(buffer, opts);
    } else {
        return new BufferReadable(buffer);
    }
}

type Lang = "cpp" | "cs" | "java" | "js" | "py";

export async function prepare_context(
    lang: Lang,
    tar_ctx: Readable,
    opts: { dockerfiles: string } = { dockerfiles: JOUEUR_DOCKERFILES },
) {
    let output: string;
    try {
        output = await mkdtemp("/tmp/build-");
        const output_tar = fs.createWriteStream(`${output}.tar`);
        tar_ctx.pipe(output_tar);
        await finish_write(output_tar);
    } catch (error) {
        winston.error("unable to create build dir");
        throw error;
    }
    try {
        await tar_extract(output);
        await copy_file(`${opts.dockerfiles}/${lang}/Dockerfile`, `${output}/Dockerfile`);
        const ready = await tar_create(output, { gz: true });
        // node doesn't have anything built in for this so...
        await rm_rf(`${output}.tar`, output);
        return buffer_to_readable(ready.stdout);
    } catch (error) {
        winston.error("error adding dockerfile");
        throw error;
    }
}
