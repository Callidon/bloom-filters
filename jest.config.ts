import type { Config } from 'jest'

const config: Config = {
    verbose: true,
    preset: 'ts-jest/presets/default-esm',
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true,
            extensionsToTreatAsEsm: '.ts',
            tsconfig: './tsconfig.eslint.json'
        }]
    },
};

export default config