const { defineConfig } = require('@rspack/cli')
const path = require('path')

module.exports = defineConfig({
    mode: 'development',
    entry: {
        browser: "./src/api.ts"
    },
    resolve: {
        tsConfigPath: path.resolve(__dirname, "tsconfig.json"),
        extensions: ["...", ".ts"],
        byDependency: {
            '@node-rs/xxhash-wasm32-wasi': {

            }
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'builtin:swc-loader',
                        options: {
                            sourceMap: false,
                            target: "es2022",
                            jsc: {
                                parser: {
                                    syntax: 'typescript'
                                }
                            }
                        }
                    }
                ]
            }
        ]
    },
    optimization: {
        minimize: false,
    }
})