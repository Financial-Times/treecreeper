const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const { validators, BizOpsError } = require('../../../packages/schema-sdk');

const sdkValidators = Object.entries(validators).reduce(
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

const validateParams = ({ type, code }) => {
	module.exports.validateTypeName(type);
	module.exports.validateCode(type, code);
};

const validateBody = ({ type, code, body: newContent }) => {
	if (newContent.code && newContent.code !== code) {
		throw httpErrors(
			400,
			`Conflicting code property \`${newContent.code}\` in payload for ${type} ${code}`,
		);
	}

	Object.entries(newContent).forEach(([propName, value]) => {
		const realPropName = propName.replace(/^!/, '');
		module.exports.validatePropertyName(realPropName);
		module.exports.validateProperty(type, realPropName, value);
	});
};

const CLIENT_ID_RX = /^[a-z\d][a-z\d-.]*[a-z\d]$/;
const CLIENT_USER_ID_RX = /^[a-z\d][a-z\d-.']*[a-z\d]$/;
const REQUEST_ID_RX = /^[a-z\d][a-z\d-]+[a-z\d]$/i;

const validateMetadatum = (header, errorMessage, expectedValueFormat) => {
	if (!expectedValueFormat.test(header)) {
		throw httpErrors(400, errorMessage);
	}
};

const validateMetadata = ({
	metadata: { clientId, clientUserId, requestId } = {},
}) => {
	validateMetadatum(
		requestId,
		stripIndents`Invalid request id \`${requestId}\`.
		Must be a string containing only a-z, 0-9 and -, not beginning or ending with -.`,
		REQUEST_ID_RX,
	);

	if (clientId) {
		validateMetadatum(
			clientId,
			stripIndents`Invalid client id \`${clientId}\`.
			Must be a string containing only a-z, 0-9, . and -, not beginning or ending with -.`,
			CLIENT_ID_RX,
		);
	}

	if (clientUserId) {
		validateMetadatum(
			clientUserId,
			stripIndents`Invalid client user id \`${clientUserId}\`.
			It does not appear to be an LDAP user, expecting firstname.surname`,
			CLIENT_USER_ID_RX,
		);
	}
};

const validateInput = input => {
	validateParams(input);
	if (input.body) {
		validateBody(input);
	}
	validateMetadata(input);
	return input;
};

module.exports = Object.assign(
	{
		validateInput,
	},
	sdkValidators,
);
