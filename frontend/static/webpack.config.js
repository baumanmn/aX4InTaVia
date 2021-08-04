/* global __dirname */

var path = require("path");

var webpack = require("webpack");
//var CopyWebpackPlugin = require("copy-webpack-plugin");
var CopyPlugin = require("copy-webpack-plugin");

var dir_js = path.resolve(__dirname, "js");
var dir_css = path.resolve(__dirname, "css");
var dir_html = path.resolve(__dirname, "../templates");
var dir_build = path.resolve(__dirname, "build");

module.exports = {
  mode: "development",
  // entry: [
  //     'babel-polyfill',
  //     path.resolve(dir_js, 'main.js')
  // ],
  entry: [path.resolve(dir_js, "entry.js"), "babel-polyfill"],

  output: {
    path: dir_build,
    filename: "bundle.js",
  },

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: [
          {
            loader: "babel-loader",
            //include: dir_js,
          },
        ],
        include: [dir_js],
      },
    ],
  },

  // debug: true,
  plugins: [
    new CopyPlugin([
      { from: dir_html },
      //{ from: dir_html, to: "dest" },
    ]),
    // Simply copies the files over
    /* new CopyWebpackPlugin([
      { from: dir_html }, // to: output.path
    ]), */
    // ,
    // // Avoid publishing files when compilation fails
    // new webpack.NoErrorsPlugin()
  ],

  stats: {
    // Nice colored output
    colors: true,
  },

  // Create Sourcemaps for the bundle
  devtool: "source-map",
  // devtool: 'inline-source-map',

  target: "web",
  // devServer: {
  //     contentBase: dir_build,
  // }
};
