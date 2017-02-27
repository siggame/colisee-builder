import * as knexModule from "knex";
import * as _ from "lodash";

import * as vars from "./vars";

export const query = knexModule({
    client: 'pg',
    connection: {
        host : vars.POSTGRES_HOST,
        port: vars.POSTGRES_PORT,
        user : vars.POSTGRES_USER,
        password : vars.POSTGRES_PASSWORD,
        database : vars.POSTGRES_DB,
    },
});

export function createGame(teams: number[]): Promise<any> {
    return new Promise((resolve, reject)=>{
        query('game').insert({}, '*')
            .then(rows=>rows[0])
            .then((game)=>{
                // Promises to insert team_game
                const ps = teams.map((team)=>{
                    return query('team_game').insert({team_id: team, game_id: game.id}, '*')
                });
                return Promise.all(ps)
                    .then(()=>{return game});
            })
            .then(resolve)
            .catch(reject);
    });
}


export function createUser(gitlab_id: number): Promise<any> {
    return new Promise((resolve, reject)=>{
        
        const data = {
            gitlab_id: gitlab_id,
        };

        query('user').insert(data, '*')
            .then(rows=>rows[0])
            .then(resolve)
            .catch(reject);
    });
}

export function createTeam(gitlab_id: number, members: number[]): Promise<any> {
    return new Promise<any>((resolve, reject)=>{

        query('team').insert({gitlab_id: gitlab_id}, '*')
            .then(rows=>rows[0])
            .then(team=>{
                return Promise.all(
                    members.map(member=>
                        query('user_team').insert({user_id: member, team_id: team.id})
                    )
                );
            })
            .then(_.noop)
            .then(resolve)
            .catch(reject);
    });
}