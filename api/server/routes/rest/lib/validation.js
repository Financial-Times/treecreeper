const httpErrors = require('http-errors');
const schema = require('@financial-times/biz-ops-schema');

const validation = Object.entries(schema)
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

const validateParams = ({ nodeType, code }) => {
	module.exports.validateTypeName(nodeType);
	module.exports.validateCode(nodeType, code);
};

const validatePayload = ({ nodeType, code, body: newContent }) => {
	if (newContent.code && newContent.code !== code) {
		throw httpErrors(
			400,
			`Conflicting code property \`${newContent.code}\` in payload for ${nodeType} ${code}`,
		);
	}

	Object.entries(newContent).forEach(([propName, value]) => {
		const realPropName = propName.replace(/^!/, '');
		module.exports.validatePropertyName(realPropName);
		module.exports.validateProperty(nodeType, realPropName, value);
	});
};

module.exports = Object.assign(
	{
		validateParams,
		validatePayload,
	},
	validation,
);
