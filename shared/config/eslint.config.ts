import { defineConfig } from "eslint/config";

import { baseConfig, strictConfig } from "@uav/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  strictConfig,
);
