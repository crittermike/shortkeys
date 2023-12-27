// This file is not going through babel transformation, so, we write it in vanilla JS.
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

module.exports = {
    webpack: (config, { dev, vendor }) => {
        config.resolve.extensions = [
            '.js',
            '.json',
            '.vue'
        ];

        config.entry = {
            'scripts/service_worker': './scripts/service_worker.js',
            'scripts/content': './scripts/content.js',
            'options/options': './options/options.js',
        };

        config.module.rules.push(
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.vue$/,
                use: ['vue-loader'],
            },
        );

        config.plugins = [
            ...config.plugins,
            new VueLoaderPlugin(),
        ];

        return config
    },

    copyIgnore: [
        '**/*.js',
        '**/*.json',
        '**/*.vue'
    ],
};
