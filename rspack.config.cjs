const { defineConfig } = require('@rspack/cli')
const rspack = require('@rspack/core')
const path = require('path')

module.exports = defineConfig({
    mode: 'production', //''none',
    target: ['web'],
    output: {
        filename: 'browser.js',
        path: 'dist/cjs/dist',
        library: 'bloom_filters',
        clean: true,
    },
    optimization: {
        splitChunks: false,
        mangleExports: false,
    },
    experiments: {
        asyncWebAssembly: true,
    },
    entry: {
        browser: "./src/browser.mts",
    },
    resolve: {
        tsConfigPath: path.resolve(__dirname, "tsconfig.json"),
        extensions: ["...", ".mts"],
        extensionAlias: {
            '.mjs': ['.mts', '.mjs'],
        },
    },
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