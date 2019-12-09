const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const EncodingPlugin = require('webpack-encoding-plugin');
const path = require('path');

const filenameTemplate = process.env.CIRCLECI
	? '[contenthash].[name]'
	: '[name]';
module.exports = {
	entry: ['./packages/tc-ui/browser/main.js'],
	resolve: {
		extensions: ['.js', '.jsx', '.css'],
	},
	output: {
		path: path.resolve(__dirname, 'dist/browser'),
		filename: `${filenameTemplate}.js`,
	},
	stats: 'minimal',
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				},
			},
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
		],
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
		new ManifestPlugin(),
		new EncodingPlugin({
			encoding: 'utf8',
		}),
	],
};

if (process.env.CIRCLECI) {
	module.exports.devtool = 'source-map';
}
