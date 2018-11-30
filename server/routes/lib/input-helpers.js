const httpErrors = require('http-errors');
const validation = require('./validation');
const { getType } = require('@financial-times/biz-ops-schema');

const isRelationship = properties => ([propName]) =>
	properties[propName].relationship;

const isAttribute = properties => entry => !isRelationship(properties)(entry);

const toArray = val => (Array.isArray(val) ? val : [val]);

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

const validateParams = ({ clientId, requestId, nodeType, code }) => {
	// TODO move these first two into middleware
	validation.validateClientId(clientId);
	validation.validateRequestId(requestId);
	// And these two too
	validation.validateTypeName(nodeType);
	validation.validateCode(nodeType, code);
};

const validatePayload = ({ nodeType, code, attributes: payload }) => {
	if (payload.code && payload.code !== code) {
		throw httpErrors(
			400,
			`Conflicting code attribute \`${payload.code}\` for ${nodeType} ${code}`
		);
	}

	Object.entries(payload).forEach(([propName, value]) => {
		validation.validatePropertyName(propName);
		validation.validateProperty(nodeType, propName, value);
	});
};

const containsRelationshipData = (type, payload) => {
	const { properties } = getType(type);
	return Object.entries(getType(type).properties)
		.filter(isRelationship(properties))
		.some(([propName]) => propName in payload); // || `!${propName}` in payload)
};

const getWriteAttributes = (type, payload, code) => {
	const { properties } = getType(type);

	payload.code = code || payload.code;

	return Object.entries(payload)
		.filter(isAttribute(properties))
		.filter(([, val]) => val !== null)
		.reduce(entriesToObject, {});
};

const getDeleteAttributes = (type, payload) => {
	const { properties } = getType(type);

	return Object.entries(payload)
		.filter(isAttribute(properties))
		.filter(([, val]) => val === null)
		.map(([key]) => key);
};

const getWriteRelationships = (type, payload) => {
	const { properties } = getType(type);
	return Object.entries(payload)
		.filter(isRelationship(properties))
		.filter(([, codes]) => codes !== null)
		.map(([propName, codes]) => [propName, toArray(codes)])
		.reduce(entriesToObject, {});
};

const getDeleteRelationships = (type, payload) => {
	const { properties } = getType(type);
	return Object.entries(payload)
		.filter(isRelationship(properties))
		.filter(([, val]) => val === null)
		.map(([propName]) => propName);

	// 	deleteRelationships: Object.entries(attributes)
	// 		.filter(([propName]) => isRelationship(propName.replace(/^!/, '')))
	// 		.filter(isDeleteRelationship)
	// 		.map(toDelete)
	// 		// filter is a hacky way of running validation over the array without having
	// 		// to worry about mutating into
	// 		.filter(([propName, codes]) => {
	// 			const { type } = properties[propName];
	// 			// this will error and bail the whole process if invalid
	// 			codes.forEach(code => validation.validateCode(type, code));
	// 			// otherwise include
	// 			return true;
	// 		}),
};

module.exports = {
	validateParams,
	validatePayload,
	containsRelationshipData,
	getWriteAttributes,
	getWriteRelationships,
	getDeleteAttributes,
	getDeleteRelationships
};
