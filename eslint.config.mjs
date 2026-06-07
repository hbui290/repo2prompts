import { defineConfig, globalIgnores as ignoreGenerated } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ignoreGenerated([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
