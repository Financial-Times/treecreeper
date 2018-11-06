const httpErrors = require('http-errors');
const schema = require('@financial-times/biz-ops-schema');
const { stripIndents } = require('common-tags');

const stringPatterns = {
	CLIENT_ID: /^[a-z\d][a-z\d\-\.]*[a-z\d]$/,
	REQUEST_ID: /^[a-z\d][a-z\d\-]+[a-z\d]$/i
};

module.exports = Object.entries(schema)
	.filter(([key]) => /^validate/.test(key))
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

const validateAttributes = module.exports.validateAttributes;

module.exports.validateAttributes = (nodeType, attributes) => {
	attributes = Object.assign({}, attributes);

	Object.keys(attributes).forEach(propName => {
		if (attributes[propName] === null) {
			delete attributes[propName];
		}
	});
	return validateAttributes(nodeType, attributes);
};

module.exports.validateClientId = id => {
	if (!stringPatterns.CLIENT_ID.test(id)) {
		throw httpErrors(
			400,
			stripIndents`Invalid client id \`${id}\`.
			Must be a string containing only a-z, 0-9, . and -, not beginning or ending with -.`
		);
	}
};

module.exports.validateRequestId = id => {
	if (!stringPatterns.REQUEST_ID.test(id)) {
		throw httpErrors(
			400,
			stripIndents`Invalid request id \`${id}\`.
			Must be a string containing only a-z, 0-9 and -, not beginning or ending with -.`
		);
	}
};
