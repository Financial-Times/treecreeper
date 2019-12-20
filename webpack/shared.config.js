const ManifestPlugin = require('webpack-manifest-plugin'); // eslint-disable-line import/no-extraneous-dependencies
const EncodingPlugin = require('webpack-encoding-plugin'); // eslint-disable-line import/no-extraneous-dependencies
// const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
	resolve: {
		extensions: ['.js', '.jsx', '.css'],
		alias: {
			react: 'preact/compat',
			'react-dom': 'preact/compat',
			// Not necessary unless you consume a module using `createClass`
			'create-react-class': 'preact/compat/lib/create-react-class',
			// Not necessary unless you consume a module requiring `react-dom-factories`
			'react-dom-factories': 'preact/compat/lib/react-dom-factories',
		},
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
				use: [
					{
						loader: 'raw-loader',
						options: {
							esModule: false,
						},
					},
				],
			},
		],
	},
	plugins: [
		new ManifestPlugin(),
		new EncodingPlugin({
			encoding: 'utf8',
		}),
	],
};
