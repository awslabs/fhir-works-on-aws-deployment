const path = require('path');

module.exports = {
    mode: 'production',
    target: 'node',
    // output: {
    //     libraryTarget: 'commonjs2',
    //     path: path.join(__dirname, '.webpack'),
    //     filename: '[name].js',
    // },
    resolve: {
        extensions: ['.js', '.ts'],
    },
    module: {
        rules: [{ test: /\.ts$/, use: 'ts-loader' }],
    },
};
