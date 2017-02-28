import * as dotenv from "dotenv";
dotenv.config();

import * as _ from "lodash";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";

import * as vars from "./vars";
import * as middleware from "./middleware";
import * as routers from "./routers";

const app: express.Application = express();

app.use(cors());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(middleware.logger);

app.use("/api", routers.api);
app.use("/", routers.web);

app.listen(vars.PORT, ()=>{
    console.log(`Listening on port ${vars.PORT}...`);
});