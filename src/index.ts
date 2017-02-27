import * as dotenv from "dotenv";
dotenv.config();

import * as _ from "lodash";
import * as express from "express";
import * as vars from "./vars";

var app = express();

app.get('/api/example', function(req, res) {
    res.send({"hello", "world"});
});