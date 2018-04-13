import { Request, RequestHandler } from "express";
import * as fileType from "file-type";
import { BadRequest } from "http-errors";
import { isArrayLike, isNil, isNumber, toNumber } from "lodash";
import * as multer from "multer";

import { createNewSubmission, teamExists } from "../db";
import { retry } from "../helpers";
import { builder } from "./builder";
import { prepare_context, readable_context } from "./context";

const upload = multer();

function assertFileType(req: Request) {
    if (isNil(req.file) || req.file.size === 0) {
        throw new BadRequest("File must be uploaded");
    }
    const { ext } = fileType(req.file.buffer);
    switch (ext) {
        case "gz":
        case "tar":
        case "zip":
            return;
        default:
            throw new BadRequest(`${ext} is not a supported file type`);
    }
}

function assertLangParamValid(req: Request) {
    if (isNil(req.params.lang)) {
        throw new BadRequest("Language must be specified");
    }
    switch (req.params.lang) {
        case "cpp":
        case "cs":
        case "java":
        case "js":
        case "py":
            return;
        default:
            throw new BadRequest(`${req.params.lang} is not a valid language choice`);
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

export const enqueue: RequestHandler[] = [
    upload.single("submission"),
    async (req, res, next) => {
        try {
            assertFileType(req);
            assertLangParamValid(req);
            await assertTeamIdParamValid(req);
            const team_id = toNumber(req.params.team_id);
            const new_submission = await retry(() => createNewSubmission(team_id));

            if (req.file.size === 0) {
                throw new BadRequest("empty archive");
            }

            const context = await readable_context(req.file.buffer);
            builder.enqueue(new_submission, await prepare_context(req.params.lang, context));
            res.status(201).json({
                submission: {
                    id: new_submission.id,
                },
            });
        } catch (error) {
            next(error);
        }
    },
];

export const start: RequestHandler = (req, res) => {
    builder.start();
    res.end();
};

export const stop: RequestHandler = (req, res) => {
    builder.stop();
    res.end();
};
