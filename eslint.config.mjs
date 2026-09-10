import tseslint from "typescript-eslint";
import next from "@next/eslint-plugin-next";
export default [{ ignores: ["node_modules/**", ".next/**", "public/**", "r2-upload/**", "workers/**", "scripts/**", "next-env.d.ts"] }, {
  plugins: { "@next/next": next },
  rules: {}
}, {
  files: ["src/**/*.{ts,tsx}"],
  linterOptions: { reportUnusedDisableDirectives: false },
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } } },
  rules: { "no-unreachable": "error", "no-constant-condition": ["error", { checkLoops: false }], "no-debugger": "error", "no-duplicate-case": "error", "constructor-super": "error" }
}];
