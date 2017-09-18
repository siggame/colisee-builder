import { db } from "@siggame/colisee-lib";
import { Request, RequestHandler } from "express";
import * as fileType from "file-type";
import { BadRequest } from "http-errors";
import { isArrayLike, isNil, isNumber, isString, toNumber } from "lodash";
import * as multer from "multer";

import { Builder } from "./builder";
import { catchError, createReadableTarStream, createSubmission } from "./helpers";
import { REGISTRY_URL } from "./vars";

const builder = new Builder({ queueLimit: 10 });
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

/**
 * Assert that if the request contains the `id` path parameter, it is a string. Throw 400 otherwise.
 * @param req 
 */
function assertIdPathParam(req: Request) {
    if (isNil(req.params.id)) {
        throw new BadRequest("ID must be provided");
    } else if (!isString(req.params.id)) {
        throw new BadRequest("ID must be a string");
    }
}

/**
 * Assert that if the request contains the `id` query parameter and is an array of strings. Throw 400 otherwise.
 * @param req 
 */
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
        res.end();
    }),
];

export const getBuildStatus: RequestHandler[] = [
    catchError<RequestHandler>(async (req, res, next) => {
        assertIdPathParam(req);
        res.end();
    }),
];

export const enqueueBuild: RequestHandler[] = [
    upload.single("submission"),
    catchError<RequestHandler>(async (req, res, next) => {
        assertFileType(req);
        await assertTeamIdParamValid(req).catch((e) => { throw e; });
        const [newSubmission] = await createSubmission(req.params.teamId);
        builder.submissions.set(req.params.teamId, {
            context: await createReadableTarStream(req.file.buffer),
            id: newSubmission.id,
            startedTime: new Date(),
            status: "queued",
            tag: `${REGISTRY_URL}/${req.params.teamId}:${newSubmission.version}`,
        });
        builder.build(req.params.teamId);
        res.end("enqueued build");
    }),
];
