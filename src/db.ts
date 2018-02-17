import { db } from "@siggame/colisee-lib";
import { isNil } from "lodash";

import { IBuildSubmission } from "./Builder/submission";

/**
 * Creates a new submission and increments the version number.
 * 
 * @export
 */
export async function createSubmission(teamId: number): Promise<db.Submission[]> {
    const [{ max: recentVersion }] = await db.connection("submissions")
        .where({ team_id: teamId })
        .max("version")
        .catch((e) => { throw e; });
    const newVersion = isNil(recentVersion) ? 0 : recentVersion + 1;
    const newSubmission = await db.connection("submissions").insert({
        image_name: "not_pushed",
        status: "queued",
        team_id: teamId,
        version: newVersion,
    }, "*")
        .then(db.rowsToSubmissions)
        .catch((e) => { throw e; });
    return newSubmission;
}

export async function updateSubmission({ context, id, ...rest }: IBuildSubmission) {
    await db.connection("submissions").update({
        image_name: rest.imageName,
        log_url: rest.logUrl,
        status: rest.status,
    }).where({ id });
}

export async function updateStatus({ id, status }: IBuildSubmission) {
    await db.connection("submissions").update({ status }).where({ id });
}

export async function teamExists(teamId: number): Promise<boolean> {
    const [{ count }] = await db.connection("teams").count("*").where({ id: teamId });
    return count > 0;
}
