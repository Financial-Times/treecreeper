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
		[
			'module-resolver',
			{
				root: ['.'],
				alias: {
					react: 'preact/compat',
					'react-dom': 'preact/compat',
					// Not necessary unless you consume a module using `createClass`
					'create-react-class':
						'preact/compat/lib/create-react-class',
					// Not necessary unless you consume a module requiring `react-dom-factories`
					'react-dom-factories':
						'preact/compat/lib/react-dom-factories',
				},
			},
		],
	],
};
