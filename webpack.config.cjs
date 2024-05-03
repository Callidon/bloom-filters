// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');


module.exports = {
    mode: 'production',
    target: 'web',
    entry: path.resolve(__dirname, './examples/website/webpack.js'),
    output: {
        path: path.resolve(__dirname, './dist/website/webpack'),
        clean: true,
    },
    devServer: {
        open: true,
        host: 'localhost',
        port: 8002
    },
    optimization: {
        splitChunks: {
          minSize: 20000,
          maxSize: 100000,
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, './examples/website/index.html'),
        }),
    ],
    // .wasm rule and experiments.asyncWebAssembly=true are required due to the use of @node-rs/xxhash
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/i,
                loader: 'babel-loader',
            },
            {
                test: /\.wasm$/,
                type: 'asset/inline'
            }
        ],
    },
    experiments: {
        asyncWebAssembly: true
    },
    // This part is mandatory to resolve the `import BloomFilters from 'bloom-filters'`
    resolve: {
        alias: {
            "bloom-filters/dist/mjs/bloom/bloom-filter.mjs": path.resolve(__dirname, './dist/mjs/bloom/bloom-filter.mjs'),
        }
    },
};
