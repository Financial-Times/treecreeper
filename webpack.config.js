const path = require('path');
const merge = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const sharedConfig = require('./webpack/shared.config.js');

const filenameTemplate = process.env.CIRCLECI
	? '[contenthash].[name]'
	: '[name]';

module.exports = merge(sharedConfig, {
	entry: ['./demo/cms/browser/main.js'],
	output: {
		path: path.resolve(__dirname, 'dist/browser'),
		filename: `${filenameTemplate}.js`,
	},
	devServer: {
		contentBase: './dist/browser',
		inline: false,
		publicPath: '/statics/',
		host: 'local.in.ft.com',
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: `${filenameTemplate}.css`,
		}),
	],
});

if (process.env.CIRCLECI) {
	module.exports.devtool = 'source-map';
}
