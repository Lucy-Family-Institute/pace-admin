module.exports = {
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
      "project": "./tsconfig.json"
  },
  "extends": [
    "standard-with-typescript",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/strict-boolean-expressions": "off",
    "@typescript-eslint/no-floating-promises": "error",
  }
}
