import tseslint from "typescript-eslint";

const RIALTO_ELEMENT_RULE = {
  selector: "JSXOpeningElement[name.name=/^(input|select|textarea)$/]",
  message:
    "Use Rialto components (Input / Select / TextArea / NumberInput) from '@mattbutlerengineering/rialto' instead of raw HTML form elements.",
};

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".wrangler/**",
      "graphify-out/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
    ],
  },
  // Parser only — no recommended rule sets. We're opting in to one rule today.
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  // Client UI: enforce Rialto components over raw HTML form elements.
  {
    files: ["src/client/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", RIALTO_ELEMENT_RULE],
    },
  },
);
