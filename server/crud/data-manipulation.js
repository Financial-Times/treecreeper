const logger = require('@financial-times/n-logger').default;
const { isSameInteger } = require('./utils');

const sanitizeNodeType = nodeType =>
	nodeType.charAt(0).toUpperCase() + nodeType.substr(1).toLowerCase();

const sanitizeCode = code => code.toLowerCase();

const sanitizeAttributes = ({
	nodeType,
	attributes,
	code,
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

const sanitizeInput = (
	{
		requestId,
		nodeType,
		code,
		query,
		body: { node: attributes = {}, relationships = {} } = {}
	},
	method
) => {
	logger.info({
		requestId,
		nodeType,
		code,
		attributes,
		relationships,
		method
	});

	code = sanitizeCode(code);

	const response = {
		requestId,
		nodeType: sanitizeNodeType(nodeType),
		code
	};

	if (attributes) {
		const { writeAttributes, deletedAttributes } = sanitizeAttributes({
			nodeType,
			attributes,
			code,
			requestId,
			method
		});
		Object.assign(response, query, {
			attributes: writeAttributes,
			deletedAttributes,
			// todo sanitize here
			relationships: [].concat(
				...Object.entries(relationships).map(([relType, relInstances]) => {
					return relInstances.map(rel => ({
						nodeType: sanitizeNodeType(rel.nodeType),
						nodeCode: sanitizeCode(rel.nodeCode),
						relType,
						direction: rel.direction
					}));
				})
			),
			relationshipTypes: Object.keys(relationships)
		});
	}
	return response;
};

const constructOutput = result => {
	const node = result.records[0].get('node');
	const response = {
		node: Object.assign({}, node.properties)
	};
	if (response.node.createdByRequest) {
		delete response.node.createdByRequest;
	}

	// check relationship key exists and is not null
	// if related is not defined it means we've done an optional match on relationships
	// and retrieved none
	if (result.records[0].has('related') && result.records[0].get('related')) {
		response.relationships = result.records.reduce((map, record) => {
			const target = record.get('related');
			const rel = record.get('relationship');
			map[rel.type] = map[rel.type] || [];

			map[rel.type].push({
				direction: isSameInteger(rel.start, node.identity)
					? 'outgoing'
					: 'incoming',
				nodeType: target.labels[0],
				nodeCode: target.properties.id
			});
			return map;
		}, {});
	} else {
		response.relationships = {};
	}

	return response;
};

module.exports = {
	sanitizeInput,
	constructOutput
};
