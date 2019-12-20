const path = require('path');
const merge = require('webpack-merge'); // eslint-disable-line import/no-extraneous-dependencies
const nodeExternals = require('webpack-node-externals'); // eslint-disable-line import/no-extraneous-dependencies
const MiniCssExtractPlugin = require('mini-css-extract-plugin'); // eslint-disable-line import/no-extraneous-dependencies
const sharedConfig = require('../../webpack/shared.config.js');

module.exports = merge(sharedConfig, {
	entry: {
		server: path.resolve(__dirname, 'src/server.js'),
		browser: path.resolve(__dirname, 'src/browser.js'),
	},
	mode: 'development',
	output: {
		path: path.resolve(__dirname, 'dist'),
		libraryExport: '',
		libraryTarget: 'commonjs',
	},
	devtool: 'source-map',
	target: 'node', // in order to ignore built-in modules like path, fs, etc.
	externals: [
		nodeExternals({
			whitelist: [
				'react-autosuggest',
				'react-autowhatever',
				'react-highlight-words',
			],
		}),
	],
	// module:{rules: [
	// 			{
	// 			test: /\.css$/,
	// 			use: [
	// 				{
	// 					loader: 'raw-loader',
	// 					options: {
	// 						esModule: false,
	// 					},
	// 				},
	// 			],
	// 		},
	// 		]}
	plugins: [
		new MiniCssExtractPlugin({
			filename: `main.css`,
		}),
	],
});
