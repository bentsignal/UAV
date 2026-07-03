import { defineConfig } from "eslint/config";

import { baseConfig } from "@uav/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  {
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "turbo/no-undeclared-env-vars": "off",
    },
  },
);
