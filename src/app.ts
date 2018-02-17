import * as dotenv from "dotenv";
dotenv.config();

import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import { ErrorRequestHandler, RequestHandler } from "express";
import * as fs from "fs";
import { HttpError } from "http-errors";
import * as winston from "winston";

import { builder } from "./Builder/builder";
import { enqueueBuild, getBuildStatus, getBuildStatuses } from "./handlers";
import { OUTPUT_DIR, PORT } from "./vars";

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

app.get("/start", (req, res) => {
    builder.run();
    winston.info("Started builder");
    res.end();
});
app.get("/status/", ...getBuildStatuses);
app.get("/status/:id", ...getBuildStatus);
app.get("/stop", (req, res) => {
    builder.stop();
    winston.info("Stopped builder");
    res.end();
});
app.post("/submit/:teamId", ...enqueueBuild);

export default () => {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }
    app.listen(PORT, () => {
        builder.run();
        winston.info(`Listening on port ${PORT}...`);
    });
};

export { app };
