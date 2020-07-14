const path = require('path');
const copyPlugin = require('copy-webpack-plugin');

const config = {
    module: {
        rules: [{
            test: /\.(js|jsx)$/u,
            exclude: '/node_modules/',
            use: 'babel-loader',
        }, {
            test: /\.scss$/u,
            use: [
                'style-loader',
                'css-loader',
                'sass-loader',
            ],
        }],
    },
    resolve: {
        extensions: ['.js'],
    },
    watchOptions: {
        ignored: ['node_modules'],
    },
    entry: ['@babel/polyfill', path.join(__dirname, 'src', 'index.js')],
    output: {
        filename: 'index.js',
    },
    target: 'web',
    plugins: [
        new copyPlugin({
            patterns: [
                {from: 'src/index.html', to: 'index.html'},
            ],
        }),
    ],
};

if (process.env.NODE_ENV === 'production') {
    module.exports = {
        ...config,
        mode: 'production',
        output: {
            ...config.output,
            path: path.resolve(__dirname, 'dist', 'prod'),
        }
    };
} else {
    module.exports = {
        ...config,
        mode: 'development',
        devtool: 'source-map',
        output: {
            ...config.output,
            path: path.resolve(__dirname, 'dist', 'dev'),
        }
    };
}
