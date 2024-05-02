const { defineConfig } = require('@rspack/cli')
const rspack = require('@rspack/core')
const path = require('path')

module.exports = defineConfig({
    mode: 'production',
    target: ['web'],
    output: {
        path: 'dist/bundle',
        library: {
            name: 'BloomFilters',
            type: 'global'
        }
    },
    optimization: {
        splitChunks: false
    },
    experiments: {
        asyncWebAssembly: true,
    },
    entry: {
        index: "./src/browser.mts",
    },
    resolve: {
        tsConfigPath: path.resolve(__dirname, "tsconfig.cjs.json"),
        extensions: ["...", ".mts", ".mjs"],
    },
    plugins: [
        new rspack.HtmlRspackPlugin({
            title: "BloomFilters Sandbox",
        })
    ],
    module: {
        rules: [
            {
                test: /\.(mts|mjs)$/,
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
})