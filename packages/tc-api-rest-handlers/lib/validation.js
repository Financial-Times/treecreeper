const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const {
	validators,
	TreecreeperUserError,
	getType,
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

const validateParams = ({ type, code }) => {
	module.exports.validateTypeName(type);
	module.exports.validateCode(type, code);
};

const validateBody = ({
	type,
	code,
	metadata: { clientId } = {},
	body: newContent,
}) => {
	if (newContent.code && newContent.code !== code) {
		throw httpErrors(
			400,
			`Conflicting code property \`${newContent.code}\` in payload for ${type} ${code}`,
		);
	}
	const { properties } = getType(type);
	Object.entries(newContent).forEach(([propName, value]) => {
		const realPropName = propName.replace(/^!/, '');
		module.exports.validatePropertyName(realPropName);
		module.exports.validateProperty(type, realPropName, value);
		const globalLock = properties[realPropName].lockedBy;
		if (globalLock && (!clientId || !globalLock.includes(clientId))) {
			throw httpErrors(
				400,
				`Cannot write ${realPropName} on ${type} ${code} - property can only be edited by client ${globalLock}`,
			);
		}
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

const coerceEmptyStringsToNull = ({ body }) => {
	Object.entries(body).forEach(([propName, value]) => {
		if (value === '') {
			body[propName] = null;
		}
	});
};

const validateInput = input => {
	validateParams(input);
	if (input.body) {
		// TODO need to do something similar for relationship properties
		// and consolidate with eth isNull checks in diff-properties.js
		// Long story short, if we convert everything to null early in here
		// then diff properties can probably be simplified
		coerceEmptyStringsToNull(input);
		validateBody(input);
	}
	validateMetadata(input);
	return input;
};

const validateRelationshipAction = relationshipAction => {
	if (!['merge', 'replace'].includes(relationshipAction)) {
		throw httpErrors(
			400,
			'PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`',
		);
	}
};

const toArray = val => (Array.isArray(val) ? val : [val]);

const validateRelationshipInput = body => {
	Object.entries(body)
		.filter(([propName]) => propName.startsWith('!'))
		.forEach(([propName, deletedCodes]) => {
			const addedCodes = toArray(body[propName.substr(1)]);
			deletedCodes = toArray(deletedCodes);
			if (deletedCodes.some(code => addedCodes.includes(code))) {
				throw httpErrors(
					400,
					'Trying to add and remove a relationship to a record at the same time',
				);
			}
		});
};

module.exports = {
	validateInput,
	validateRelationshipAction,
	validateRelationshipInput,
	...sdkValidators,
};
