import * as dotenv from "dotenv";
dotenv.config();

import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "http-errors";
import * as winston from "winston";

import { enqueueBuild, getBuildStatus, getBuildStatuses } from "./handlers";
import * as vars from "./vars";

winston.configure({
    transports: [
        new (winston.transports.Console)({
            timestamp: true,
        }),
    ],
});

const app = express();

// Logger Middleware
const logger: RequestHandler = (req, res, next) => {
    winston.info(`${req.method}\t${req.url}`);
    next();
};

// Error Middleware
const errorHandler: ErrorRequestHandler = (err: HttpError, req, res, next) => {
    winston.error(err.message);
    if (err.stack) { winston.error(err.stack); }
    res.status(err.status).end(err.message);
};

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(logger);
app.use(errorHandler);

app.get("/status/", ...getBuildStatuses);
app.get("/status/:id", ...getBuildStatus);
app.post("/submit/:teamId", ...enqueueBuild);

export default () => {
    app.listen(vars.PORT, () => {
        winston.info(`Listening on port ${vars.PORT}...`);
    });
};

export { app };
