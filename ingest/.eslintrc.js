module.exports = {
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
      "project": "./tsconfig.json"
  },
  "extends": "standard-with-typescript",
  "rules": {
    "@typescript-eslint/strict-boolean-expressions": "off"
  }
}
