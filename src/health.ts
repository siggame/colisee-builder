import * as express from "express";

const router: express.Router = express.Router();

let health = {
    // initial health settings
    status: 200,
    message: "Server OK",
    last_updated: Date.now()
}

export function update_health(status, message) {
    // set health variable/object
    health.status = status;
    health.message = message;
    health.last_updated = Date.now();

}

router.get("/health", (req,res) => {
    res.status(health.status);
    res.send(health.message);
})

export default router;
