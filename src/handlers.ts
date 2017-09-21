import { db } from "@siggame/colisee-lib";
import { Request, RequestHandler } from "express";
import * as fileType from "file-type";
import { BadRequest, NotFound } from "http-errors";
import { isArrayLike, isNil, isNumber, isString, omit, toNumber } from "lodash";
import * as multer from "multer";

import { builder } from "./builder";
import { catchError, createReadableTarStream, createSubmission } from "./helpers";
import { REGISTRY_URL } from "./vars";

const upload = multer();

function assertFileType(req: Request) {
    if (isNil(req.file)) {
        throw new BadRequest("File must be uploaded");
    }
    const { ext } = fileType(req.file.buffer);
    if (ext !== "tar" && ext !== "zip" && ext !== "gz") {
        throw new BadRequest(`${ext} is not a supported file type`);
    }
}

function assertIdPathParam(req: Request) {
    if (isNil(req.params.id)) {
        throw new BadRequest("ID must be provided");
    } else if (!isString(req.params.id)) {
        throw new BadRequest("ID must be a string");
    }
}

function assertIdsQueryParam(req: Request) {
    if (isNil(req.query.ids)) {
        throw new BadRequest("IDs must be provided");
    } else if (!isArrayLike(req.query.ids)) {
        throw new BadRequest("IDs must be provided in an list");
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
            const [exists] = await db.connection("teams").where({ id: req.params.teamId });
            if (isNil(exists)) {
                throw new BadRequest(`No team exists with the id ${req.params.teamId}`);
            }
        }
    }
}

export const getBuildStatuses: RequestHandler[] = [
    catchError<RequestHandler>(async (req, res, next) => {
        assertIdsQueryParam(req);
        const submitted = Array.from(builder.submissions.entries())
            .filter(([id]) => req.query.ids.includes(id))
            .map(([id, submission]) => [id, omit(submission, ["context"])]);
        res.json(submitted);
        res.end();
    }),
];

export const getBuildStatus: RequestHandler[] = [
    catchError<RequestHandler>(async (req, res, next) => {
        assertIdPathParam(req);
        if (builder.submissions.has(req.params.id)) {
            res.json(omit(builder.submissions.get(req.params.id), ["context"]));
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
            .catch((e) => { throw e; });
        const [newSubmission] = await createSubmission(req.params.teamId)
            .catch((e) => { throw e; });
        builder.submissions.set(req.params.teamId, {
            context: createReadableTarStream(req.file.buffer),
            id: newSubmission.id,
            startedTime: new Date(),
            status: "queued",
            tag: `${REGISTRY_URL}/${req.params.teamId}:${newSubmission.version}`,
        });
        res.end("enqueued build");
    }),
];
