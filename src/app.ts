import * as dotenv from "dotenv";
dotenv.config();

import * as _ from "lodash";
import {Request, Response, NextFunction} from "express";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as winston from "winston";

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

app.use((req: Request, res: Response, next: NextFunction) => {
    winston.info(`${req.method}\t${req.url}`);
    next();
});

app.listen(vars.PORT, ()=>{
    winston.info(`Listening on port ${vars.PORT}...`);
});