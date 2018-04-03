module.exports = [
    {
        entry: './src/index.js',
        mode: 'production',
        output: {
            filename: 'bundle.js',
            libraryTarget: 'var',
            library: 'Eliza'
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader'
                    }
                }
            ]
        }
    },
    {
        entry: './src/index.js',
        mode: 'production',
        output: {
            filename: 'module.js',
            libraryTarget: 'commonjs2'
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader'
                    }
                }
            ]
        }
    }
];
