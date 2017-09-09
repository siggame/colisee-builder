import { NextFunction, Request, Response } from "express";
import * as fileType from "file-type";
import { BadRequest, NotFound } from "http-errors";
import * as _ from "lodash";

import * as lib from "./builder";
import { createReadableTarStream } from "./helpers";

export function getBuildStatuses(req: Request, res: Response, next: NextFunction): void {
    Promise.resolve()
        .catch(next);
}

export function getBuildStatus(req: Request, res: Response, next: NextFunction): void {
    Promise.resolve()
        .then(() => assertIdPathParam(req))
        .catch(next);
}

export function getBuildLog(req: Request, res: Response, next: NextFunction): void {
    Promise.resolve()
        .then(() => assertIdPathParam(req))
        .catch(next);
}

export function getBuildImage(req: Request, res: Response, next: NextFunction): void {
    Promise.resolve()
        .then(() => assertIdPathParam(req))
        .catch(next);
}

export async function enqueueBuild(req: Request, res: Response, next: NextFunction): Promise<void> {
    assertFileType(req);
    const context = await createReadableTarStream(req.file.buffer);
    res.end("enqueued build");
}

function assertFileType(req: Request) {
    if (_.isNil(req.file)) {
        throw new BadRequest("File must be uploaded");
    }
    const { ext } = fileType(req.file.buffer);
    if (ext !== "tar" && ext !== "zip" && ext !== "gz") {
        throw new BadRequest(`${ext} is not a supported file type`);
    }
}

/**
 * Assert that if the request contains the `id` path parameter, it is a string. Throw 400 otherwise.
 * @param req 
 */
function assertIdPathParam(req: Request) {
    if (_.isNil(req.params.id)) {
        throw new NotFound("ID must be provided");
    }
    if (!_.isString(req.params.id)) {
        throw new BadRequest("ID must be a string");
    }
}

/**
 * Assert that if the request contains the `id` query parameter and is an array of strings. Throw 400 otherwise.
 * @param req 
 */
function assertIdsQueryParam(req: Request) {

}
