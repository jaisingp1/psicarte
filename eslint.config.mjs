import js from "@eslint/js";
import tseslint from "typescript-eslint";
import html from "eslint-plugin-html";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "dist/**", "build/**", ".git/**", "database.sqlite"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    }
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off"
    }
  },
  {
    files: ["public/**/*.js", "public/**/*.html"],
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off"
    }
  },
  {
    files: ["**/*.html"],
    plugins: {
      html
    },
    settings: {
      "html/html-extensions": [".html"]
    }
  }
];
