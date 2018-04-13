import * as dotenv from "dotenv";
dotenv.config();

import * as cors from "cors";
import * as express from "express";
import { ErrorRequestHandler, RequestHandler } from "express";
import * as fs from "fs";
import { HttpError } from "http-errors";
import * as winston from "winston";

import { builder, enqueue, start, stop } from "./Builder";
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
    if (err.stack) { winston.error(err.stack); }
    res.status(err.statusCode).end(err.message);
};

app.use(cors());
app.use(logger);
app.use(errorHandler);

app.get("/start", start);
app.get("/stop", stop);
app.post("/submit/:lang/:team_id", ...enqueue);

export default () => {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }
    app.listen(PORT, () => {
        builder.start();
        winston.info(`Listening on port ${PORT}...`);
    });
};

export { app };
