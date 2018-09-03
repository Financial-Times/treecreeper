module.exports = {
	extends: ['origami-component', 'plugin:prettier/recommended'],
	env: {
		node: true,
		mocha: true,
	},
	parserOptions: {
		ecmaVersion: 2017,
	},
	globals: {
		expect: true,
	},
};
