import { app, default as builder } from "./app";

if (!module.parent) {
    builder();
}

export { app };
