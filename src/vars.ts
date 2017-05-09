import * as _ from "lodash";

export const DB_USER: string = _.defaultTo(process.env.DB_USER, 'colisee');
export const DB_PASS: string = _.defaultTo(process.env.DB_PASS, 'colisee');
export const DB_HOST: string = _.defaultTo(process.env.DB_HOST, 'localhost');
export const DB_PORT: number = _.defaultTo(process.env.DB_HOST, 5432);
export const DB_NAME: string = _.defaultTo(process.env.DB_NAME, 'colisee');

export const PORT: number = _.defaultTo(process.env.PORT, 3000);
