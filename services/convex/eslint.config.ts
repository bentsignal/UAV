import convexPlugin from "@convex-dev/eslint-plugin";
import { defineConfig } from "eslint/config";

import { baseConfig, strictConfig } from "@uav/eslint-config/base";
import { convexConfig } from "@uav/eslint-config/convex";
import { createStrictSyntax } from "@uav/eslint-config/syntax";

export default defineConfig(
  {
    ignores: ["src/_generated/**"],
  },
  baseConfig,
  strictConfig,
  convexConfig,
  createStrictSyntax({ ts: true }),
  ...convexPlugin.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
);
