import * as express from "express";

const router: express.Router = express.Router();

router.get('/example', function(req, res) {
    res.send({hello: "world"});
});

export default router;