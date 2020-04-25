const httpErrors = require('http-errors');
const {
	validators,
	TreecreeperUserError,
} = require('@financial-times/tc-schema-sdk');

const sdkValidators = Object.entries(validators).reduce(
	(methods, [key, validator]) => {
		methods[key] = (...args) => {
			try {
				return validator(...args);
			} catch (e) {
				if (e instanceof TreecreeperUserError) {
					throw httpErrors(400, e.message);
				}
				throw e;
			}
		};
		return methods;
	},
	{},
);

module.exports = sdkValidators;
