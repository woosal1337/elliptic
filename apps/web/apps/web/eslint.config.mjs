import { nextJsConfig } from "@elliptic/eslint-config/next-js";

export default [...nextJsConfig, { ignores: ["**/*.test.ts", "**/*.test.tsx"] }];
