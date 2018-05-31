const logger = require('@financial-times/n-logger').default;
const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');

const stringPatterns = {
	CAPITAL_CASE: /^[A-Z][a-z]+$/,
	KEBAB_LOWER_CASE: /^[a-z\d][a-z\d\-]+[a-z\d]$/,
	KEBAB_CASE: /^[a-z\d][a-z\d\-]+[a-z\d]$/i,
	CAPITALISED_SNAKE_CASE: /^[A-Z][A-Z_]+[A-Z]$/,
	CAMEL_CASE: /^[a-z][a-zA-Z\d]+$/
};

const sanitizeNodeType = nodeType => {
	const sanitizedNodeType =
		nodeType.charAt(0).toUpperCase() + nodeType.substr(1).toLowerCase();
	if (!stringPatterns.CAPITAL_CASE.test(sanitizedNodeType)) {
		throw httpErrors(
			400,
			stripIndents`Invalid node type \`${nodeType}\`.
			Must be a string containing only a-z, beginning with a capital letter`
		);
	}
	return sanitizedNodeType;
};

const sanitizeCode = code => {
	const sanitizedCode = code.toLowerCase();
	if (!stringPatterns.KEBAB_LOWER_CASE.test(sanitizedCode)) {
		throw httpErrors(
			400,
			stripIndents`Invalid node identifier \`${code}\`.
			Must be a string containing only a-z, 0-9 and -, not beginning or ending with -.`
		);
	}
	return sanitizedCode;
};

const sanitizeRequestId = code => {
	if (!stringPatterns.KEBAB_CASE.test(code)) {
		throw httpErrors(
			400,
			stripIndents`Invalid request id \`${code}\`.
			Must be a string containing only a-z, 0-9 and -, not beginning or ending with -.`
		);
	}
	return code;
};

const sanitizeRelationshipName = relationship => {
	const sanitizedRelationship = relationship.toUpperCase();
	if (!stringPatterns.CAPITALISED_SNAKE_CASE.test(sanitizedRelationship)) {
		throw httpErrors(
			400,
			stripIndents`Invalid relationship \`${relationship}\`.
			Must be a string containing only A-Z and _, not beginning or ending with _.`
		);
	}
	return sanitizedRelationship;
};

const sanitizeAttributeNames = attributes => {
	const nonCamelCaseAttributeName = Object.keys(attributes).find(
		// FIXME: allow SF_ID as, at least for a while, we need this to exist so that
		// salesforce sync works during the transition to the new architecture
		name => name !== 'SF_ID' && !stringPatterns.CAMEL_CASE.test(name)
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

const sanitizeAttributes = ({
	nodeType,
	code,
	attributes,
	requestId,
	method
}) => {
	if (attributes.id && sanitizeCode(attributes.id) !== code) {
		throw httpErrors(
			400,
			`Conflicting id attribute \`${attributes.id}\` for ${nodeType} ${code}`
		);
	}

	sanitizeAttributeNames(attributes);

	if (method === 'CREATE') {
		attributes.createdByRequest = requestId;
	}

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
	requestId,
	nodeType,
	code,
	attributes = {},
	query,
	method
}) => {
	sanitizeRequestId(requestId);

	code = sanitizeCode(code);

	const result = {
		requestId,
		nodeType: sanitizeNodeType(nodeType),
		code
	};

	const { writeAttributes, deletedAttributes } = sanitizeAttributes({
		nodeType,
		attributes,
		code,
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

	if (method === 'CREATE') {
		result.attributes.id = result.code;
	}

	input.relationships = input.relationships || {};

	if (input.relationships) {
		const relationships = Object.entries(input.relationships).reduce(
			(map, [relType, relInstances]) =>
				Object.assign(map, {
					[sanitizeRelationshipName(relType)]: relInstances
				}),
			{}
		);
		Object.assign(result, {
			relationshipTypes: Object.keys(relationships),
			relationships: [].concat(
				...Object.entries(relationships).map(([relType, relInstances]) => {
					return relInstances.map(rel => ({
						nodeType: sanitizeNodeType(rel.nodeType),
						nodeCode: sanitizeCode(rel.nodeCode),
						relType,
						direction: rel.direction
					}));
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

	return Object.assign(sanitizeShared(input), {
		relatedType: sanitizeNodeType(input.relatedType),
		relatedCode: sanitizeCode(input.relatedCode),
		relationshipType: sanitizeRelationshipName(input.relationshipType)
	});
};

module.exports = {
	sanitizeNode,
	sanitizeRelationship
};
