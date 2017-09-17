import { defaultTo, toInteger, toString } from "lodash";

export const PORT: number = defaultTo<number>(toInteger(process.env.PORT), 3000);
export const REGISTRY_URL: string = defaultTo<string>(toString(process.env.REGISTRY_URL), "localhost:5000");
