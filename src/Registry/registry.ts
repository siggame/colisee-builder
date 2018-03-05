import * as request from "request-promise-native";

export class Registry {
    public auth: { "X-Registry-Auth": string; };
    constructor(public url: string) {
        this.auth = { "X-Registry-Auth": JSON.stringify({ serveraddress: this.url }) };
    }
    public async getTeamTags(team_id: number) {
        /* https://docs.docker.com/registry/spec/api/ */
        return await request(`http://${this.url}/v2/team_${team_id}/tags/list`, { json: true })
            .then((images: { tags?: string[], errors?: any }) => images)
            .catch((error) => { throw error; });
    }
}
