import * as dotenv from "dotenv";
dotenv.config();

import * as _ from "lodash";
import {Request, Response, NextFunction} from "express";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as winston from "winston";
import * as httpErrors from "http-errors";

import * as handlers from "./handlers";
import * as vars from "./vars";

winston.configure({
    transports: [
        new (winston.transports.Console)({
            timestamp: true
        })
    ]
});

const app = express();

app.use(cors());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get("/", handlers.getBuildStatuses);
app.get("/{id}", handlers.getBuildStatus);
app.get("/{id}/log", handlers.getBuildLog);
app.get("/{id}/image", handlers.getBuildImage);
app.post("/", handlers.enqueueBuild);

// Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    winston.info(`${req.method}\t${req.url}`);
    next();
});

// Error Middleware
app.use((err: httpErrors.HttpError, req: Request, res:Response, next: NextFunction) => {
    winston.warn(`Got error: ${err.toString()}`);
    res.status(err.status).send(err);
})

app.listen(vars.PORT, ()=>{
    winston.info(`Listening on port ${vars.PORT}...`);
});