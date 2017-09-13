import { defaultTo, toInteger } from "lodash";

export const PORT: number = defaultTo<number>(toInteger(process.env.PORT), 3000);
