module.exports = {
	setupFilesAfterEnv: ['./test-helpers/extend-jest.js'],
	moduleNameMapper: {
		'^react$': 'preact/compat',
		'^react-dom$': 'preact/compat',
	},
};
