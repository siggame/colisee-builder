import * as _ from "lodash";

export const PORT: number = _.defaultTo(process.env.PORT, 3000);
export const EXAMPLE_VAR: string = _.defaultTo(process.env.EXAMPLE_VAR, "example");
