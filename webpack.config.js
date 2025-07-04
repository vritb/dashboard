/**
 * Webpack configuration
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    // Main entry point
    entry: './src/index.js',

    // Output configuration
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
      clean: true // Clean the output directory before build
    },

    // Module rules for various file types
    module: {
      rules: [
        // JavaScript files
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        // CSS files
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        }
      ]
    },

    // Plugins
    plugins: [
      // Generate HTML file
      new HtmlWebpackPlugin({
        template: './dashboard.html',
        filename: 'dashboard.html',
        inject: 'body'
      }),
      new HtmlWebpackPlugin({
        template: './index.html',
        filename: 'index.html',
        inject: 'body'
      }),
      new HtmlWebpackPlugin({
        template: './test-filter.html',
        filename: 'test-filter.html',
        inject: 'body'
      }),

      // Extract CSS to separate files in production
      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: 'css/[name].[contenthash].css'
        })
      ] : [])
    ],

    // Development server configuration
    devServer: {
      static: {
        directory: path.join(__dirname, 'public')
      },
      hot: true,
      port: 3000,
      open: true
    },

    // Optimization
    optimization: {
      splitChunks: {
        chunks: 'all'
      }
    },

    // Enable source maps in development
    devtool: isProduction ? false : 'source-map',

    // Resolve configuration
    resolve: {
      extensions: ['.js'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  };
};
