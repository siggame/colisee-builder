import * as body_parser from "body-parser";
import { Request, RequestHandler } from "express";
import * as fileType from "file-type";
import { BadRequest, NotFound } from "http-errors";
import { isArrayLike, isNil, isNumber, omit, toNumber } from "lodash";
import * as multer from "multer";

import { createSubmission, teamExists } from "../db";
import { catchError } from "../helpers";
import { builder } from "./builder";
import { ReadableContext } from "./context";

const upload = multer();

function assertFileType(req: Request) {
    if (isNil(req.file) || req.file.size === 0) {
        throw new BadRequest("File must be uploaded");
    }
    const { ext } = fileType(req.file.buffer);
    if (ext !== "tar" && ext !== "zip" && ext !== "gz") {
        throw new BadRequest(`${ext} is not a supported file type`);
    }
}

function assertIdPathParam(req: Request) {
    if (isNil(req.params.team_id)) {
        throw new BadRequest("Team id must be provided");
    } else {
        const team_id = toNumber(req.params.team_id);
        if (!isNumber(team_id)) {
            throw new BadRequest("Team id must be a number");
        }
    }
}

function assertIdsQueryParam(req: Request) {
    if (isNil(req.body.ids)) {
        throw new BadRequest("Team id's must be provided");
    } else if (!isArrayLike<number>(req.body.ids)) {
        throw new BadRequest("Team id's must be a list of numbers");
    }
}

async function assertTeamIdParamValid(req: Request) {
    if (isNil(req.params.team_id)) {
        throw new BadRequest("Team ID must not be null");
    } else {
        const team_id = toNumber(req.params.team_id);
        if (!isNumber(team_id)) {
            throw new BadRequest("Team ID must be a number");
        } else {
            if (!(await teamExists(team_id))) {
                throw new BadRequest(`No team exists with the id ${team_id}`);
            }
        }
    }
}

export const statuses: RequestHandler[] = [
    body_parser.json(),
    catchError<RequestHandler>(async (req, res, next) => {
        assertIdsQueryParam(req);
        const submitted = Array.from(builder.submissions.entries())
            .filter(([id]) => req.body.ids.indexOf(id) >= 0)
            .map(([id, queue]) => queue.empty() ? [id, {}] : [id, omit(queue.front(), ["context"])]);
        res.json(submitted);
        res.end();
    }),
];

export const status: RequestHandler[] = [
    catchError<RequestHandler>(async (req, res, next) => {
        assertIdPathParam(req);
        const team_id = toNumber(req.params.team_id);
        const queue = builder.submissions.get(toNumber(team_id));
        if (queue && queue.size() > 0) {
            res.json(omit(queue.front(), ["context"]));
            res.end();
        } else {
            throw new NotFound(`No submission found for id ${team_id}`);
        }
    }),
];

export const enqueue: RequestHandler[] = [
    upload.single("submission"),
    catchError<RequestHandler>(async (req, res, next) => {
        assertFileType(req);
        await assertTeamIdParamValid(req)
            .catch((error) => { throw error; });
        const team_id = toNumber(req.params.team_id);
        const [newSubmission] = await createSubmission(team_id)
            .catch((error) => { throw error; });
        if (req.file.size === 0) {
            throw new BadRequest("empty archive");
        }
        builder.submissions.enqueue(team_id, {
            context: ReadableContext(req.file.buffer),
            ...newSubmission,
        });
        res.status(201).json({
            submission: {
                id: newSubmission.id,
            },
        });
    }),
];

export const start: RequestHandler = (req, res) => {
    builder.start();
    res.end();
};

export const stop: RequestHandler = (req, res) => {
    builder.stop();
    res.end();
};
