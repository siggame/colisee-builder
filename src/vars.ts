import * as _ from "lodash";

export const EXAMPLE_VAR: string = _.defaultTo(process.env.EXAMPLE_VAR, "example");
