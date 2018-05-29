const logger = require('@financial-times/n-logger').default;
const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');

const sanitizeNodeType = nodeType => {
	const sanitizedNodeType =
		nodeType.charAt(0).toUpperCase() + nodeType.substr(1).toLowerCase();
	if (!/^[A-Z][a-z]+$/.test(sanitizedNodeType)) {
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
	if (!/^[a-z\d][a-z\d\-]+[a-z\d]$/.test(sanitizedCode)) {
		throw httpErrors(
			400,
			stripIndents`Invalid node identifier \`${code}\`.
			Must be a string containing only a-z, 0-9 and -, not beginning or ending with -.`
		);
	}
	return sanitizedCode;
};

const sanitizeRequestId = code => {
	if (!/^[a-z\d][a-z\d\-]+[a-z\d]$/.test(code)) {
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
	if (!/^[A-Z][A-Z_]+[A-Z]$/.test(sanitizedRelationship)) {
		throw httpErrors(
			400,
			stripIndents`Invalid relationship \`${relationship}\`.
			Must be a string containing only A-Z and _, not beginning or ending with _.`
		);
	}
	return sanitizedRelationship;
};

const sanitizeAttributes = ({
	nodeType,
	code,
	attributes,
	requestId,
	method
}) => {
	if (attributes.id && sanitizeCode(attributes.id) !== code) {
		throw {
			status: 400,
			message: `Conflicting id attribute \`${
				attributes.id
			}\` for ${nodeType} ${code}`
		};
	}

	if (method === 'CREATE') {
		attributes.id = code;
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
		relationship: sanitizeRelationshipName(input.relationship)
	});
};

module.exports = {
	sanitizeNode,
	sanitizeRelationship
};
