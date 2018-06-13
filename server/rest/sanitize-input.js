const logger = require('../lib/multiline-logger');
const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const schemaCompliance = require('./schema-compliance');
const { stringPatterns } = require('../../schema');

const validateClientId = id => {
	if (!stringPatterns.CODE.test(id)) {
		throw httpErrors(
			400,
			stripIndents`Invalid client id \`${id}\`.
			Must be a string containing only a-z, 0-9, . and -, not beginning or ending with -.`
		);
	}
};

const validateRequestId = id => {
	if (!stringPatterns.REQUEST_ID.test(id)) {
		throw httpErrors(
			400,
			stripIndents`Invalid request id \`${id}\`.
			Must be a string containing only a-z, 0-9 and -, not beginning or ending with -.`
		);
	}
};

const validateAttributeNames = attributes => {
	const nonCamelCaseAttributeName = Object.keys(attributes).find(
		// FIXME: allow SF_ID as, at least for a while, we need this to exist so that
		// salesforce sync works during the transition to the new architecture
		name => name !== 'SF_ID' && !stringPatterns.ATTRIBUTE_NAME.test(name)
	);

	if (nonCamelCaseAttributeName) {
		throw httpErrors(
			400,
			`Invalid attribute ${nonCamelCaseAttributeName}. Must be a camelCase string, i.e.
			beginning with a lower case letter, and only containing upper and lower case letters
			and digits`
		);
	}
};

const categorizeAttributes = ({ nodeType, code, attributes }) => {
	if (attributes.code && attributes.code !== code) {
		throw httpErrors(
			400,
			`Conflicting code attribute \`${
				attributes.code
			}\` for ${nodeType} ${code}`
		);
	}

	validateAttributeNames(attributes);
	schemaCompliance.validateNodeAttributes(nodeType, attributes);

	return {
		deletedAttributes: Object.entries(attributes)
			.filter(([, val]) => val === null)
			.map(([key]) => key),
		writeAttributes: Object.entries(attributes)
			.filter(([, val]) => val !== null)
			.reduce((map, [key, val]) => Object.assign(map, { [key]: val }), {})
	};
};

const mergeInput = (obj, method, bodyParser) => {
	obj.method = method;
	Object.assign(obj, bodyParser(obj.body));
	delete obj.body;
	return obj;
};

const sanitizeShared = ({
	clientId,
	requestId,
	nodeType,
	code,
	attributes = {},
	query,
	method
}) => {
	validateClientId(clientId);
	validateRequestId(requestId);
	schemaCompliance.validateNodeType(nodeType);
	schemaCompliance.validateCode(nodeType, code);

	const result = {
		clientId,
		requestId,
		nodeType,
		code
	};

	const { writeAttributes, deletedAttributes } = categorizeAttributes({
		nodeType,
		attributes,
		code,
		clientId,
		requestId,
		method
	});

	Object.assign(result, query, {
		attributes: writeAttributes,
		deletedAttributes
	});

	return result;
};

const sanitizeNode = (inputs, method) => {
	const input = mergeInput(inputs, method, (body = {}) => ({
		attributes: body.node,
		relationships: body.relationships
	}));
	logger.info(Object.assign({ event: 'NODE_ENDPOINT_CALL' }, input));

	const result = sanitizeShared(input);

	if (method === 'CREATE' || (method === 'UPDATE' && result.attributes.code)) {
		result.attributes.code = result.code;
	}

	input.relationships = input.relationships || {};

	if (input.relationships) {
		const relationships = Object.entries(input.relationships).reduce(
			(map, [relType, relInstances]) =>
				Object.assign(map, {
					[relType]: relInstances
				}),
			{}
		);
		Object.assign(result, {
			relationshipTypes: Object.keys(relationships),
			relationships: [].concat(
				...Object.entries(relationships).map(([relType, relInstances]) => {
					return relInstances.map(({ direction, nodeCode, nodeType }) => {
						schemaCompliance.validateRelationship({
							nodeType: direction === 'outgoing' ? result.nodeType : nodeType,
							relatedType:
								direction === 'outgoing' ? nodeType : result.nodeType,
							relationshipType: relType,
							relatedCode: direction === 'outgoing' ? nodeCode : result.code
						});

						return {
							nodeType,
							nodeCode,
							relType,
							direction
						};
					});
				})
			)
		});
	}
	return result;
};

const sanitizeRelationship = (inputs, method) => {
	const input = mergeInput(inputs, method, (body = {}) => ({
		attributes: body
	}));

	logger.info(Object.assign({ event: 'RELATIONSHIP_ENDPOINT_CALL' }, input));

	const completedInput = Object.assign(sanitizeShared(input), {
		relatedType: input.relatedType,
		relatedCode: input.relatedCode,
		relationshipType: input.relationshipType
	});

	schemaCompliance.validateRelationship(completedInput);

	return completedInput;
};

module.exports = {
	sanitizeNode,
	sanitizeRelationship
};
