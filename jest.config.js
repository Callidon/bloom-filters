const { TS_JS_TRANSFORM_PATTERN, TS_TRANSFORM_PATTERN, createJsWithTsPreset } = require('ts-jest')
const config = createJsWithTsPreset({ tsconfig: "./tsconfig.jest.json" })
// only transform typescript files or js ESM files
config.transform["^(.+\\/dist/esm/.+\\.js)|(.+\\.ts)$"] = config.transform[TS_JS_TRANSFORM_PATTERN]
delete config.transform[TS_JS_TRANSFORM_PATTERN]
module.exports = {
    ...config,
}