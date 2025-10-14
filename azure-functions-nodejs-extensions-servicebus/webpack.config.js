const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = (_env, argv) => {
    const isDevMode = argv.mode === 'development';
    return {
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
        output: {
            path: `${__dirname}/dist/`,
            filename: isDevMode
                ? 'azure-functions-extensions-servicebus.js'
                : 'azure-functions-extensions-servicebus.min.js',
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
};
