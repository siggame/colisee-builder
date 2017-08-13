import * as _ from "lodash";

export const PORT: number = _.defaultTo<number>(_.toInteger(process.env.PORT), 3000);
