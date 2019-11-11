const httpErrors = require('http-errors');
const {
	validators,
	BizOpsError,
} = require('../../../../../packages/tc-schema-sdk');

const validation = Object.entries(validators).reduce(
	(methods, [key, validator]) => {
		methods[key] = (...args) => {
			try {
				return validator(...args);
			} catch (e) {
				if (e instanceof BizOpsError) {
					throw httpErrors(400, e.message);
				}
				throw e;
			}
		};
		return methods;
	},
	{},
);

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
