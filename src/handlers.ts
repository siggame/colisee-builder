import { NextFunction, Request, Response } from "express";
import { BadRequest, NotFound } from "http-errors";
import * as _ from "lodash";
import * as winston from "winston";

import * as lib from "./builder";

export function getBuildStatuses(req: Request, res: Response, next: NextFunction): void {
    Promise.resolve()
        .then(buildOptions)
        .then(lib.getBuildStatuses)
        .catch(next);

    function buildOptions(): lib.GetBuildStatusesOptions {
        return {
            ids: req.query.id,
        };
    }
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
    const { originalname } = req.file;
    winston.info(`Team ID: ${req.params.teamId}`);
    winston.info(`File Name: ${originalname}`);
    res.json({ originalname });
    res.end();
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
