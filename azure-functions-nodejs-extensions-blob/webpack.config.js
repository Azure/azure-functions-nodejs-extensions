const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = (_env, argv) => {
    const isDevMode = argv.mode === 'development';
    const commonConfig = {
        entry: './src/index.ts',
        target: 'node',
        node: {
            __dirname: false,
        },
        devtool: 'source-map',
        externals: [/^[^\.]+/],
        module: {
            parser: {
                javascript: {
                    commonjsMagicComments: true,
                },
            },
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: 'ts-loader',
                },
            ],
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
        },
        plugins: [
            new ForkTsCheckerWebpackPlugin({}),
            new ESLintPlugin({
                files: ['src/**/*.ts', 'test/**/*.ts'],
                fix: isDevMode,
            }),
        ],
    };

    const cjsConfig = {
        ...commonConfig,
        output: {
            path: `${__dirname}/dist/`,
            filename: isDevMode ? 'azure-functions-extensions-blob.js' : 'azure-functions-extensions-blob.min.js',
            libraryTarget: 'commonjs2',
        },
    };

    const esmConfig = {
        ...commonConfig,
        experiments: { outputModule: true },
        output: {
            path: `${__dirname}/dist/`,
            filename: isDevMode ? 'azure-functions-extensions-blob.mjs' : 'azure-functions-extensions-blob.min.mjs',
            library: { type: 'module' },
        },
    };

    return [cjsConfig, esmConfig];
};
