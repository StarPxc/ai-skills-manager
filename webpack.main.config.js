module.exports = {
  entry: './src/main/index.js',
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
  target: 'electron-main',
  externals: {
    'adm-zip': 'commonjs adm-zip',
    'better-sqlite3': 'commonjs better-sqlite3',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
