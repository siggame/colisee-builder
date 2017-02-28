import * as express from "express";
import * as path from "path";

const router: express.Router = express.Router();

router.use("/lib", express.static(path.join(__dirname, "../../bower_components")));

router.use("/", express.static(path.join(__dirname, "../../client")));

export default router;