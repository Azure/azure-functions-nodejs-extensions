const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const { defineConfig, globalIgnores } = require('eslint/config');
const chaiFriendly = require('eslint-plugin-chai-friendly');
const headers = require('eslint-plugin-headers');
const { importX } = require('eslint-plugin-import-x');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const simpleImportSort = require('eslint-plugin-simple-import-sort');

module.exports = defineConfig([
    globalIgnores(['**/*.js', '**/*.mjs', '**/*.cjs', 'out/**', 'dist/**']),
    {
        files: ['**/*.ts'],
        extends: [js.configs.recommended, tseslint.configs['flat/recommended-type-checked'], prettierRecommended],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: __dirname,
                sourceType: 'module',
            },
        },
        plugins: {
            headers,
            'import-x': importX,
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            'headers/header-format': [
                'error',
                {
                    source: 'string',
                    style: 'line',
                    content: 'Copyright (c) .NET Foundation. All rights reserved.\nLicensed under the MIT License.',
                    trailingNewlines: 2,
                },
            ],
            '@typescript-eslint/no-deprecated': 'error',
            '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'always' }],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-non-null-assertion': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
            'prefer-const': ['error', { destructuring: 'all' }],
            '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
            '@typescript-eslint/return-await': 'error',
            eqeqeq: 'error',
            '@typescript-eslint/no-empty-function': 'off',
            'simple-import-sort/imports': [
                'error',
                {
                    groups: [['^\\u0000', '^node:', '^@?\\w', '^', '^\\.']],
                },
            ],
            'simple-import-sort/exports': 'error',
            'import-x/first': 'error',
            'import-x/newline-after-import': 'error',
            'import-x/no-duplicates': 'error',
        },
    },
    {
        files: ['scripts/**/*.ts', 'test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
        },
    },
    {
        files: ['test/**/*.ts'],
        plugins: {
            'chai-friendly': chaiFriendly,
        },
        rules: {
            '@typescript-eslint/no-unused-expressions': 'off',
            'chai-friendly/no-unused-expressions': 'error',
        },
    },
    {
        files: ['scripts/**/*.ts'],
        rules: {
            '@typescript-eslint/restrict-template-expressions': 'off',
        },
    },
]);
