// This file is not going through babel transformation, so, we write it in vanilla JS.
const webpack = require('webpack')

module.exports = {
    webpack: (config, { dev, vendor }) => {
        // Perform customizations to webpack config
        // Important: return the modified config
        config.module.rules.push({
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        });
        return config
    }
};