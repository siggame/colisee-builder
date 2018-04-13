import * as request from "request-promise-native";
import * as winston from "winston";

interface RegistryImageInfo { tags?: string[]; errors?: any; }
export interface RegistryAuth { "X-Registry-Auth": string; }

export class Registry {

    public auth: RegistryAuth;
    public url: string;

    constructor(public host: string, public port: number) {
        this.url = `${this.host}:${this.port}`;
        this.auth = { "X-Registry-Auth": JSON.stringify({ serveraddress: this.url }) };
    }

    public async verify_push(team_id: number, version: number) {
        /* https://docs.docker.com/registry/spec/api/ */
        try {
            const images: RegistryImageInfo = await request(`http://${this.url}/v2/team_${team_id}/tags/list`, { json: true });
            if (images.errors) {
                throw new Error(`${images.errors}`);
            } else if (images.tags && images.tags.some((tag) => tag === `${version}`)) {
                return;
            } else {
                throw new Error(`failed to push image for team ${team_id}`);
            }
        } catch (error) {
            winston.error("failed to contact registry");
            throw error;
        }
    }
}
