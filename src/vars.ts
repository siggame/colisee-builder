import { defaultTo, toNumber } from "lodash";

export const BUILD_INTERVAL: number = defaultTo<number>(toNumber(process.env.BUILD_INTERVAL), 1500);
export const BUILD_LIMIT: number = defaultTo<number>(toNumber(process.env.BUILD_LIMIT), 10);
export const PORT: number = defaultTo<number>(toNumber(process.env.PORT), 3000);
export const REGISTRY_URL: string = defaultTo<string>(process.env.REGISTRY_URL, "localhost:5000");
