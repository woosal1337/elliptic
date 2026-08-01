import { reactInternalConfig } from "@elliptic/eslint-config/react-internal";

export default [...reactInternalConfig, { ignores: ["**/*.test.ts", "**/*.test.tsx"] }];
