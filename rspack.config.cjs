const { defineConfig } = require('@rspack/cli')
const rspack = require('@rspack/core')
const path = require('path')

module.exports = defineConfig({
    mode: 'production',
    target: 'web',
    devServer: {
        open: true,
        host: 'localhost',
        port: 8001,
    },
    output: {
        path: path.resolve(__dirname, 'dist/website/rspack/'),
        clean: true,
    },
    plugins: [
        new rspack.HtmlRspackPlugin({
            template: path.resolve(__dirname, './examples/website/index.html'),
        })
    ],
    entry: path.resolve(__dirname, "./examples/website/rspack.mts"),
    resolve: {
        tsConfigPath: path.resolve(__dirname, "tsconfig.json"),
        extensions: ["...", ".ts"],
    },
    module: {
        // .wasm rule and experiments.asyncWebAssembly=true are required due to the use of @node-rs/xxhash
        rules: [
            {
                test: /\.ts?$/,
                type: 'javascript/auto',
                use: [
                    {
                        loader: 'builtin:swc-loader',
                        options: {
                            jsc: {
                                parser: {
                                    syntax: 'typescript'
                                }
                            },
                        }
                    },
                ]
            },
            {
                test: /\.wasm$/,
                type: 'asset/inline'
            }
        ]
    },
    experiments: {
        asyncWebAssembly: true,
    },
})