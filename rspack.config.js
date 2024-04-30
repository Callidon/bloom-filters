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
                            target: "es6",
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