import { db } from "@siggame/colisee-lib";
import { isNil } from "lodash";

import { IBuildSubmission } from "./Builder";

function getRecentSubmission(team_id: number) {
    return new Promise<number>((res, rej) => {
        db.connection("submissions")
            .where({ team_id })
            .max("version")
            .then(([{ max }]: { max: number }[]) => { res(max); })
            .catch(rej);
    }).catch((error) => { throw error; });
}

function createNewSubmission(team_id: number, version: number) {
    return new Promise<db.Submission[]>((res, rej) => {
        db.connection("submissions")
            .insert({ image_name: "not_pushed", status: "queued", team_id, version }, "*")
            .then(db.rowsToSubmissions)
            .then(res)
            .catch(rej);
    }).catch((error) => { throw error; });
}

/**
 * Creates a new submission and increments the version number.
 * 
 * @export
 */
export async function createSubmission(team_id: number): Promise<db.Submission[]> {
    const recent_version = await getRecentSubmission(team_id);
    const new_version = isNil(recent_version) ? 0 : recent_version + 1;
    return await createNewSubmission(team_id, new_version);
}

export function updateSubmission({ context, id, ...rest }: IBuildSubmission) {
    return new Promise((res, rej) => {
        db.connection("submissions")
            .update({ image_name: rest.imageName, log_url: rest.logUrl, status: rest.status })
            .where({ id })
            .then((_) => { res(); })
            .catch(rej);
    }).catch((error) => { throw error; });
}

export function updateStatus({ id, status }: IBuildSubmission) {
    return new Promise((res, rej) => {
        db.connection("submissions")
            .update({ status })
            .where({ id })
            .then((_) => { res(); })
            .catch(rej);
    }).catch((error) => { throw error; });
}

export function teamExists(team_id: number): Promise<boolean> {
    return new Promise<boolean>((res, rej) => {
        db.connection("teams")
            .count("*")
            .where({ id: team_id })
            .then(([{ count }]: { count: number }[]) => { res(count > 0); })
            .catch(rej);
    }).catch((error) => { throw error; });
}
