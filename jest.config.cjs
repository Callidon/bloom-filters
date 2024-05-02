const { defaults } = require('jest-config')

module.exports = {
    verbose: true,
    preset: 'ts-jest/presets/default-esm',
    resolver: 'ts-jest-resolver',
    testMatch: ['**/*.test.*'],
    moduleFileExtensions: [...defaults.moduleFileExtensions, 'mts'],
    transform: {
        '^.+\\.m(t|j)s$': ['ts-jest', {
            useESM: true,
            extensionsToTreatAsEsm: '.mts',
            tsconfig: './tsconfig.eslint.json'
        }]
    },
};