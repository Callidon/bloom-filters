import { defineConfig } from '@rspack/cli'
import rspack from '@rspack/core'
import path from 'path'

export default defineConfig({
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
        index: "./src/index.ts",
    },
    resolve: {
        tsConfigPath: path.resolve(import.meta.dirname, "tsconfig.json"),
        extensions: ["...", ".ts"],
    },
    plugins: [
        new rspack.HtmlRspackPlugin({
            title: "BloomFilters Sandbox",
        })
    ],
    module: {
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
    devServer: {
        historyApiFallback: {
            index: 'dist/index.html'
        }
    }
})