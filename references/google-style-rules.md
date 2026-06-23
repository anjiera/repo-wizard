# Google Style Guide & Formatting Standards

This document defines standard formatting and style guidelines based on the official Google Style Guides, along with the configurations to automate enforcement.

---

## 1. C/C++ Google Style Enforcement (`.clang-format`)

For C and C++ codebases, formatting is enforced using `clang-format` configured to match the Google C++ Style Guide.

### 1.1 Google Style `.clang-format` Template
Save this file at the workspace root to automate C/C++ formatting:

```yaml
---
Language: Cpp
BasedOnStyle: Google
AccessModifierOffset: -4
AlignAfterOpenBracket: Align
AlignConsecutiveAssignments: false
AlignConsecutiveDeclarations: false
AlignOperands: true
AlignTrailingComments: true
AllowAllParametersOfDeclarationOnNextLine: true
AllowShortBlocksOnASingleLine: false
AllowShortCaseLabelsOnASingleLine: false
AllowShortFunctionsOnASingleLine: Empty
AllowShortIfStatementsOnASingleLine: false
AllowShortLoopsOnASingleLine: false
AlwaysBreakAfterDefinitionReturnType: None
AlwaysBreakAfterReturnType: None
AlwaysBreakBeforeMultilineStrings: true
AlwaysBreakTemplateDeclarations: true
BinPackArguments: true
BinPackParameters: true
BraceWrapping:
  AfterClass: false
  AfterControlStatement: false
  AfterEnum: false
  AfterFunction: false
  AfterNamespace: false
  AfterObjCDeclaration: false
  AfterStruct: false
  AfterUnion: false
  BeforeElse: false
  BeforeWhile: false
  IndentSpaces: false
  SplitEmptyFunction: true
  SplitEmptyRecord: true
  SplitEmptyNamespace: true
BreakBeforeBinaryOperators: None
BreakBeforeBraces: Attach
BreakBeforeTernaryOperators: true
BreakConstructorInitializers: BeforeColon
BreakInheritanceList: BeforeColon
BreakStringLiterals: true
ColumnLimit: 80
CommentPragmas: '^ IWYU pragma:'
ConstructorInitializerAllOnOneLineOrOnePerLine: true
ConstructorInitializerIndentWidth: 4
ContinuationIndentWidth: 4
Cpp11BracedListStyle: true
DerivePointerAlignment: false
DisableFormat: false
ExperimentalAutoDetectBinPacking: false
FixNamespaceComments: true
ForEachMacros: [ foreach, Q_FOREACH, BOOST_FOREACH ]
IncludeBlocks: Regroup
IncludeCategories:
  - Regex: '^<ext/.*>'
    Priority: 2
  - Regex: '^<.*\.h>'
    Priority: 1
  - Regex: '^<.*>'
    Priority: 1
  - Regex: '.*'
    Priority: 3
IndentCaseLabels: true
IndentPPDirectives: None
IndentWidth: 2
KeepEmptyLinesAtTheStartOfBlocks: false
MacroBlockBegin: ''
MacroBlockEnd: ''
MaxEmptyLinesToKeep: 1
NamespaceIndentation: None
ObjCBlockIndentWidth: 2
ObjCSpaceAfterProperty: false
ObjCSpaceBeforeProtocolList: false
PenaltyBreakAssignment: 20
PenaltyBreakBeforeFirstCallParameter: 1
PenaltyBreakComment: 300
PenaltyBreakFirstLessLess: 120
PenaltyBreakString: 1000
PenaltyExcessCharacter: 1000000
PenaltyReturnTypeOnItsOwnLine: 200
PointerAlignment: Left
ReflowComments: true
SortIncludes: true
SortUsingDeclarations: true
SpaceAfterCStyleCast: false
SpaceAfterTemplateKeyword: true
SpaceBeforeAssignmentOperators: true
SpaceBeforeCpp11BracedList: false
SpaceBeforeCtorInitializerColon: true
SpaceBeforeInheritanceColon: true
SpaceBeforeParens: ControlStatements
SpaceBeforeRangeBasedForLoopColon: true
SpaceInEmptyParentheses: false
SpacesBeforeTrailingComments: 2
SpacesInAngles: false
SpacesInContainerLiterals: false
SpacesInCStyleCastParentheses: false
SpacesInParentheses: false
SpacesInSquareBrackets: false
Standard: Auto
TabWidth: 8
UseTab: Never
```

---

## 2. JavaScript / TypeScript Google Style (`eslint-config-google`)

For JavaScript and TypeScript, style guidelines are based on the Google JavaScript Style Guide, utilizing 2-space indentation, strict JSDoc comments, and line length rules.

### 2.1 ESLint Configuration Template (`.eslintrc.json`)
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

## 3. Java Google Style (`google-java-format`)

For Java repositories, formatting is enforced using the `google-java-format` plugin or command-line tool.
*   **Indentation:** 2 spaces.
*   **Imports:** No wildcard imports (`import static` is permitted).
*   **Column Limit:** 100 columns (instead of the standard 80).
*   **Braces:** K&R style (non-empty blocks do not have a line break before the opening brace).

---

## 4. Enforcement Strategy

When onboarding repositories, agents should:
1.  Verify if a formatting tool configuration exists.
2.  If the developer requests Google Style enforcement, scaffold the corresponding configuration files (`.clang-format` or `.eslintrc.json`) at the workspace root.
3.  Configure pre-commit hooks (Husky or lint-staged) to run formatters automatically before commits.
