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
                    options: { transpileOnly: true },
                },
            ],
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
        },
        plugins: [
            new ForkTsCheckerWebpackPlugin({
                typescript: {
                    configFile: 'tsconfig.json',
                },
            }),
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
            filename: isDevMode
                ? 'azure-functions-extensions-kafka.js'
                : 'azure-functions-extensions-kafka.min.js',
            libraryTarget: 'commonjs2',
        },
    };

    const esmConfig = {
        ...commonConfig,
        experiments: { outputModule: true },
        output: {
            path: `${__dirname}/dist/`,
            filename: isDevMode
                ? 'azure-functions-extensions-kafka.mjs'
                : 'azure-functions-extensions-kafka.min.mjs',
            library: { type: 'module' },
        },
    };

    return [cjsConfig, esmConfig];
};
