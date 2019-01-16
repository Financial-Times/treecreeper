const httpErrors = require('http-errors');
const schema = require('@financial-times/biz-ops-schema');

module.exports = Object.entries(schema)
	.filter(([key]) => key.startsWith('validate'))
	.reduce((methods, [key, validator]) => {
		methods[key] = (...args) => {
			try {
				return validator(...args);
			} catch (e) {
				if (e instanceof schema.BizOpsError) {
					throw httpErrors(400, e.message);
				}
				throw e;
			}
		};
		return methods;
	}, {});
