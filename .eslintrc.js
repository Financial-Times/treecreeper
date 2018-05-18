module.exports = {
    extends: ['origami-component', 'prettier'],
    env: {
			node: true,
			mocha: true
		},
		parserOptions: {
			ecmaVersion: 2017
		},
		plugins: ['prettier'],
    rules: {
        'prettier/prettier': [
            'error', {
                useTabs:true,
                singleQuote:true
            }
        ]
    },
    globals: {
    	expect: true
    }
};
