# Google JavaScript & TypeScript Style Guide & Formatting Standards

This document defines standard formatting and style guidelines for JavaScript and TypeScript based on the official Google JavaScript Style Guide, along with configurations to automate enforcement.

---

## 1. JavaScript / TypeScript Google Style (`eslint-config-google`)

For JavaScript and TypeScript, style guidelines are based on the Google JavaScript Style Guide, utilizing 2-space indentation, strict JSDoc comments, and line length rules.

### 1.1 ESLint Configuration Template (`.eslintrc.json`)
```json
{
  "extends": ["eslint:recommended", "google"],
  "env": {
    "node": true,
    "es6": true,
    "browser": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "indent": ["error", 2, {
      "SwitchCase": 1,
      "ignoredNodes": ["ConditionalExpression"]
    }],
    "max-len": ["error", {
      "code": 80,
      "tabWidth": 2,
      "ignoreUrls": true
    }],
    "require-jsdoc": ["warn", {
      "require": {
        "FunctionDeclaration": true,
        "MethodDefinition": true,
        "ClassDeclaration": true
      }
    }],
    "valid-jsdoc": ["warn", {
      "requireReturn": false,
      "requireParamDescription": true,
      "requireReturnDescription": true
    }]
  }
}
```

---

## 2. Enforcement Strategy

When onboarding JS/TS repositories, agents should:
1. Verify if a formatting tool configuration exists.
2. If the developer requests Google Style enforcement, tool the corresponding `.eslintrc.json` configuration file at the workspace root.
3. Configure pre-commit hooks (Husky or lint-staged) to run formatters automatically before commits.
