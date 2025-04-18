import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";

export default defineConfig([
  {
    ignores: ["**/node_modules/**", "**/dist/**", "cdk.out/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    plugins: { js },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    extends: ["js/recommended"],
    rules: {
      "no-console": "warn",
      "no-unused-vars": "warn",
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ["./tsconfig.json"],
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
  prettier,
]);
