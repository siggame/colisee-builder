import { defaultTo, toNumber } from "lodash";
import { hostname } from "os";

export const BUILD_INTERVAL: number = defaultTo<number>(toNumber(process.env.BUILD_INTERVAL), 1500);
export const BUILD_LIMIT: number = defaultTo<number>(toNumber(process.env.BUILD_LIMIT), 10);
export const OUTPUT_DIR: string = defaultTo<string>(process.env.OUTPUT_DIR, `/app/output/${hostname()}`);
export const PORT: number = defaultTo<number>(toNumber(process.env.PORT), 8080);
export const REGISTRY_HOST_EXTERNAL: string = defaultTo<string>(process.env.REGISTRY_HOST_EXTERNAL, "localhost");
export const REGISTRY_HOST_INTERNAL: string = defaultTo<string>(process.env.REGISTRY_HOST_INTERNAL, "localhost");
export const REGISTRY_PORT: number = defaultTo<number>(toNumber(process.env.REGISTRY_PORT), 5000);
