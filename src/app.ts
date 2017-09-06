import * as dotenv from "dotenv";
dotenv.config();

import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import { NextFunction, Request, Response } from "express";
import * as httpErrors from "http-errors";
import * as _ from "lodash";
import * as multer from "multer";
import * as winston from "winston";

import * as handlers from "./handlers";
import * as vars from "./vars";

winston.configure({
    transports: [
        new (winston.transports.Console)({
            timestamp: true,
        }),
    ],
});

const app = express();

const upload = multer();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/status/", handlers.getBuildStatuses);
app.get("/status/:id", handlers.getBuildStatus);
app.post("/submit/:teamId", upload.single("submission"), handlers.enqueueBuild);

// Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    winston.info(`${req.method}\t${req.url}`);
    next();
});

// Error Middleware
app.use((err: httpErrors.HttpError, req: Request, res: Response, next: NextFunction) => {
    winston.warn(`Got error: ${err.toString()}`);
    res.status(err.status).send(err);
});

app.listen(vars.PORT, () => {
    winston.info(`Listening on port ${vars.PORT}...`);
});
