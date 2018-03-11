import { db } from "@siggame/colisee-lib";
import { Transaction } from "knex";
import * as winston from "winston";

async function get_recent_submission_version(trx: Transaction, team_id: number) {
    const [max]: { version: number }[] = await db.connection("submissions")
        .transacting(trx)
        .where({ team_id })
        .select(db.connection.raw("max(version) as version"));
    return max ? max.version : -1;
}

export async function createNewSubmission(team_id: number): Promise<db.Submission> {
    return db.connection.transaction(async (trx): Promise<db.Submission> => {
        try {
            const last_version = await get_recent_submission_version(trx, team_id);
            const [submission] = await db.connection("submissions")
                .transacting(trx)
                .insert({ image_name: "not_pushed", status: "queued", team_id, version: last_version + 1 }, "*")
                .then(db.rowsToSubmissions);
            return submission;
        } catch (error) {
            winston.error("unable to create new submission");
            throw error;
        }
    });
}

export async function updateSubmission({ id, ...rest }: db.Submission) {
    try {
        return await db.connection("submissions")
            .update({ image_name: rest.imageName, log_url: rest.logUrl, status: rest.status })
            .where({ id })
            .thenReturn();
    } catch (error) {
        throw error;
    }
}

export async function updateStatus({ id, status }: db.Submission) {
    try {
        return await db.connection("submissions")
            .update({ status })
            .where({ id })
            .thenReturn();
    } catch (error) {
        winston.error(`failed to update submission ${id}`);
        throw error;
    }
}

export async function teamExists(team_id: number) {
    try {
        return await db.connection("teams")
            .count("*")
            .where({ id: team_id })
            .then(([{ count }]: { count: number }[]) => count > 0);
    } catch (error) {
        winston.error(`failed to see if team ${team_id} exists`);
        throw error;
    }
}
