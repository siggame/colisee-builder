import * as _ from "lodash";

export const POSTGRES_HOST: string = _.defaultTo(process.env.POSTGRES_HOST, "localhost");
export const POSTGRES_PORT: number = _.defaultTo(process.env.POSTGRES_PORT, 5432);
export const POSTGRES_USER: string = _.defaultTo(process.env.POSTGRES_USER, "postgres");
export const POSTGRES_PASSWORD: string = _.defaultTo(process.env.POSTGRES_PASSWORD, "postgres");
export const POSTGRES_DB: string =  _.defaultTo(process.env.POSTGRES_DB, "postgres");