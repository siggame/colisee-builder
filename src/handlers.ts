import { Request, RequestHandler } from "express";
import * as fileType from "file-type";
import { BadRequest, NotFound } from "http-errors";
import { isArrayLike, isNil, isNumber, omit, toNumber } from "lodash";
import * as multer from "multer";

import { builder } from "./Builder";
import { createSubmission, teamExists } from "./db";
import { catchError, createReadableTarStream } from "./helpers";

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
    if (isNil(req.params.teamId)) {
        throw new BadRequest("Team id must be provided");
    } else if (!isNumber(req.params.teamId)) {
        throw new BadRequest("Team id must be a number");
    }
}

function assertIdsQueryParam(req: Request) {
    if (isNil(req.query.ids)) {
        throw new BadRequest("Team id's must be provided");
    } else if (!isArrayLike<number>(req.query.ids)) {
        throw new BadRequest("Team id's must be a list of numbers");
    }
}

async function assertTeamIdParamValid(req: Request) {
    if (isNil(req.params.teamId)) {
        throw new BadRequest("Team ID must not be null");
    } else {
        const teamIdAsNumber = toNumber(req.params.teamId);
        if (!isNumber(teamIdAsNumber)) {
            throw new BadRequest("Team ID must be a number");
        } else {
            if (!(await teamExists(teamIdAsNumber))) {
                throw new BadRequest(`No team exists with the id ${req.params.teamId}`);
            }
        }
    }
}

export const getBuildStatuses: RequestHandler[] = [
    catchError<RequestHandler>(async (req, res, next) => {
        assertIdsQueryParam(req);
        const submitted = Array.from(builder.submissions.entries())
            .filter(([id]) => req.query.ids.indexOf(id) >= 0)
            .map(([id, queue]) => queue.empty() ? [id, {}] : [id, omit(queue.front(), ["context"])]);
        res.json(submitted);
        res.end();
    }),
];

export const getBuildStatus: RequestHandler[] = [
    catchError<RequestHandler>(async (req, res, next) => {
        assertIdPathParam(req);
        const queue = builder.submissions.get(req.params.id);
        if (queue && queue.size() > 0) {
            res.json(omit(queue.front(), ["context"]));
            res.end();
        } else {
            throw new NotFound(`No submission found for id ${req.params.id}`);
        }
    }),
];

export const enqueueBuild: RequestHandler[] = [
    upload.single("submission"),
    catchError<RequestHandler>(async (req, res, next) => {
        assertFileType(req);
        await assertTeamIdParamValid(req)
            .catch((error) => { throw error; });
        const [newSubmission] = await createSubmission(req.params.teamId)
            .catch((error) => { throw error; });
        builder.submissions.enqueue(req.params.teamId, {
            context: createReadableTarStream(req.file.buffer),
            ...newSubmission,
        });
        res.end("enqueued build");
    }),
];
