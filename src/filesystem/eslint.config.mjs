import globals from "globals";
import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["filesystem/api/*js"], // Apply to all filesystem files
    languageOptions: {
      globals: globals.browser,
    },
    ...pluginJs.configs.recommended,
  },
  {
    files: ["tests/*js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha,
      },
    },
    ...pluginJs.configs.recommended,
  }
];
