import { defaultTo, toNumber } from "lodash";
import { hostname } from "os";

export const BUILD_INTERVAL: number = defaultTo<number>(toNumber(process.env.BUILD_INTERVAL), 1500);
export const BUILD_LIMIT: number = defaultTo<number>(toNumber(process.env.BUILD_LIMIT), 10);
export const OUTPUT_DIR: string = defaultTo<string>(process.env.OUTPUT_DIR, `/app/output/${hostname()}`);
export const PORT: number = defaultTo<number>(toNumber(process.env.PORT), 3000);
export const REGISTRY_HOST: string = defaultTo<string>(process.env.REGISTRY_HOST, "localhost");
export const REGISTRY_PORT: number = defaultTo<number>(toNumber(process.env.REGISTRY_PORT), 5000);
