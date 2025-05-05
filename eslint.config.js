const tseslint = require('@typescript-eslint/eslint-plugin')
const prettier = require('eslint-plugin-prettier')
const parser = require('@typescript-eslint/parser')
const node = require('eslint-plugin-node')
const { fixupPluginRules } = require('@eslint/compat')
const js = require('@eslint/js')
const globals = require('globals')


module.exports = [
    js.configs.recommended,
    {
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        ignores: [
            'dist/',
            'docs/',
            'build/',
            'node_modules/',
            '.github',
        ],
        languageOptions: {
            parser,
            parserOptions: {
                ecmaVersion: '2023',
                project: ['tsconfig.json', './tsconfig.eslint.json'],
            },
            globals: {
                ...globals.browser,
                ...globals.amd,
                ...globals.mocha,
                ...globals.node,
                ...globals.nodeBuiltin,
            }
        },
        plugins: {
            '@typescript-eslint': tseslint,
            prettier: fixupPluginRules(prettier),
            node: fixupPluginRules(node),
        },
        settings: {
            node: {
                allowModules: [],
                resolvePaths: [
                    './src',
                    './tests'
                ],
                tryExtensions: [
                    '.ts',
                    '.js'
                ]
            }
        }
    }
]
    





