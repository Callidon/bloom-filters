const { defaults } = require('jest-config')

module.exports = {
    verbose: true,
    preset: 'ts-jest/presets/default-esm',
    resolver: 'ts-jest-resolver',
    testMatch: ['**/*.test.*'],
    moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts'],
    transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
            useESM: true,
            extensionsToTreatAsEsm: '.ts',
            tsconfig: './tsconfig.eslint.json'
        }]
    },
};