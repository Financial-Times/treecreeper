const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const { getType } = require('@financial-times/tc-schema-sdk');
const {
	validateTypeName,
	validateProperty,
	validateCode,
	validatePropertyName,
} = require('./wrap-sdk-validators');

const toArray = val => (Array.isArray(val) ? val : [val]);

const validateRelationshipAction = relationshipAction => {
	if (!['merge', 'replace'].includes(relationshipAction)) {
		throw httpErrors(
			400,
			'PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`',
		);
	}
};

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

const validateParams = ({ type, code, query: { idField } = {} }) => {
	validateTypeName(type);
	// TODO check that method is one of the allowed ones
	if (idField) {
		validateProperty(type, idField, code);
	} else {
		validateCode(type, code);
	}
};

const validateBody = ({
	type,
	code,
	metadata: { clientId } = {},
	body: newContent,
	query: { idField = 'code' } = {},
}) => {
	if (newContent[idField] && newContent[idField] !== code) {
		throw httpErrors(
			400,
			`Conflicting ${idField} property \`${newContent.code}\` in payload for ${type} ${code}`,
		);
	}
	const { properties } = getType(type);
	Object.entries(newContent).forEach(([propName, value]) => {
		const realPropName = propName.replace(/^!/, '');
		validatePropertyName(realPropName);
		validateProperty(type, realPropName, value);
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

const validateInput = input => {
	validateParams(input);
	if (input.body) {
		validateBody(input);
	}
	validateMetadata(input);
	return input;
};

module.exports = {
	validateRelationshipAction,
	validateRelationshipInput,
	validateInput,
	validateCode,
};
