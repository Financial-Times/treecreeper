module.exports = {
	extends: ['origami-component', 'plugin:prettier/recommended'],
	env: {
		node: true,
		jest: true,
		mocha: true
	},
	parserOptions: {
		ecmaVersion: 2017
	},
	globals: {
		expect: true
	}
};
