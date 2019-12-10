module.exports = {
	presets: [
		[
			'@babel/preset-env',
			{
				targets: {
					node: true,
				},
			},
		],
	],
	plugins: [
		[
			'@babel/plugin-transform-react-jsx',
			{
				pragma: 'h', // default pragma is React.createElement
				pragmaFrag: 'Fragment', // default is React.Fragment
				throwIfNamespace: false, // defaults to true
			},
		],
	],
};
