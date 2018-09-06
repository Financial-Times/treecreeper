const { logger } = require('../lib/request-context');
const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const schemaCompliance = require('./schema-compliance');
const stringPatterns = {
	CLIENT_ID: /^[a-z\d][a-z\d\-\.]*[a-z\d]$/,
	REQUEST_ID: /^[a-z\d][a-z\d\-]+[a-z\d]$/i
};

const validateClientId = id => {
	if (!stringPatterns.CLIENT_ID.test(id)) {
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

const categorizeAttributes = ({ nodeType, code, attributes }) => {
	if (attributes.code && attributes.code !== code) {
		throw httpErrors(
			400,
			`Conflicting code attribute \`${
				attributes.code
			}\` for ${nodeType} ${code}`
		);
	}

	schemaCompliance.validateAttributeNames(attributes);
	schemaCompliance.validateAttributes(nodeType, attributes);

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
	schemaCompliance.validateTypeName(nodeType);
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
