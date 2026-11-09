import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const mutatingArrayMethods = 'push|pop|shift|unshift|splice|fill|copyWithin';

export default defineConfig(
  globalIgnores(['dist/', 'coverage/', 'node_modules/']),
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-param-reassign': ['error', { props: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ClassDeclaration, ClassExpression',
          message: 'Game logic is written as pure functions, not classes.',
        },
        {
          selector:
            'ForStatement, ForInStatement, ForOfStatement, WhileStatement, DoWhileStatement',
          message: 'Use map/filter/reduce or recursion instead of manual loops.',
        },
        {
          selector: `CallExpression[callee.property.name=/^(${mutatingArrayMethods})$/]`,
          message: 'Do not mutate arrays; build a new one instead.',
        },
        {
          selector:
            'AssignmentExpression[left.type="MemberExpression"], UpdateExpression[argument.type="MemberExpression"]',
          message: 'Do not mutate objects; create a new one instead.',
        },
        {
          selector: 'VariableDeclaration[kind="let"]',
          message: 'Use const; reassignable bindings hide state changes.',
        },
      ],
    },
  },
  {
    files: ['src/ui/**/*.ts', 'src/main.ts', 'src/storage/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  prettierConfig,
);
