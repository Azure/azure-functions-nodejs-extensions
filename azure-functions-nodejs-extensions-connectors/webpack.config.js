const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = (_env, argv) => {
    const isDevMode = argv.mode === 'development';

    const sharedConfig = {
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
                    options: { transpileOnly: true },
                },
            ],
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
        },
    };

    const cjsConfig = {
        ...sharedConfig,
        output: {
            path: `${__dirname}/dist/`,
            filename: isDevMode
                ? 'azure-functions-extensions-connectors.js'
                : 'azure-functions-extensions-connectors.min.js',
            libraryTarget: 'commonjs2',
        },
        plugins: [
            new ForkTsCheckerWebpackPlugin({
                typescript: {
                    configFile: 'tsconfig.json',
                },
            }),
            new ESLintPlugin({
                files: ['src/**/*.ts', 'test/**/*.ts'],
                exclude: ['samples/**/*'],
                fix: isDevMode,
            }),
        ],
    };

    const esmConfig = {
        ...sharedConfig,
        experiments: {
            outputModule: true,
        },
        output: {
            path: `${__dirname}/dist/`,
            filename: isDevMode
                ? 'azure-functions-extensions-connectors.mjs'
                : 'azure-functions-extensions-connectors.min.mjs',
            library: {
                type: 'module',
            },
        },
        plugins: [],
    };

    return [cjsConfig, esmConfig];
};
