const httpErrors = require('http-errors');
const validation = require('./validation');
const { getType } = require('@financial-times/biz-ops-schema');

const categorizeAttributes = ({ nodeType, code, attributes }) => {
	if (attributes.code && attributes.code !== code) {
		throw httpErrors(
			400,
			`Conflicting code attribute \`${
				attributes.code
			}\` for ${nodeType} ${code}`
		);
	}

	validation.validateAttributeNames(attributes);
	validation.validateAttributes(nodeType, attributes);

	const { properties } = getType(nodeType, {
		relationshipStructure: 'graphql'
	});

	Object.keys(attributes).forEach(name => {
		if (!properties[name]) {
			throw httpErrors(400, `Unexpected attribute \`${name}\` on ${nodeType}`);
		}
	});

	const isRelationship = ([name]) =>
		properties[name] && properties[name].relationship;

	const isAttribute = entry => !isRelationship(entry);

	return {
		deleteAttributes: Object.entries(attributes)
			.filter(isAttribute)
			.filter(([, val]) => val === null)
			.map(([key]) => key),
		writeAttributes: Object.entries(attributes)
			.filter(isAttribute)
			.filter(([, val]) => val !== null)
			.reduce(
				(map, [propName, val]) => Object.assign(map, { [propName]: val }),
				{}
			),
		deleteRelationships: Object.entries(attributes)
			.filter(isRelationship)
			.filter(([, val]) => val === null)
			.map(([propName]) => propName),
		writeRelationships: Object.entries(attributes)
			.filter(isRelationship)
			.filter(([, codes]) => codes !== null)
			.map(
				([propName, codes]) =>
					Array.isArray(codes) ? [propName, codes] : [propName, [codes]]
			)
			// filter is a hacky way of running validation over the array without having
			// to worry about mutating into
			.filter(([propName, codes]) => {
				const { type } = properties[propName];
				// this will error and bail the whole process if invalid
				codes.forEach(code => validation.validateCode(type, code));
				// otherwise include
				return true;
			})
			.reduce(
				(map, [propName, val]) => Object.assign(map, { [propName]: val }),
				{}
			)
	};
};

const validateParams = ({ clientId, requestId, nodeType, code }) => {
	// TODO move these first two into middleware
	validation.validateClientId(clientId);
	validation.validateRequestId(requestId);
	validation.validateTypeName(nodeType);
	validation.validateCode(nodeType, code);
};

module.exports = {
	validateParams,
	categorizeAttributes
};
