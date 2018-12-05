const httpErrors = require('http-errors');
const validation = require('./validation');
const { getType } = require('@financial-times/biz-ops-schema');

const stripNegation = propName => propName.replace(/^!/, '');

const isRelationship = properties => propName =>
	properties[propName].relationship;

const isProperty = properties => ([propName]) =>
	!isRelationship(properties)(stripNegation(propName));

const isWriteRelationship = properties => ([propName, codes]) =>
	propName.charAt(0) !== '!' &&
	isRelationship(properties)(propName) &&
	codes !== null;

const isDeleteRelationship = properties => ([propName, codes]) =>
	(propName.charAt(0) === '!' &&
		isRelationship(properties)(propName.substr(1))) ||
	(isRelationship(properties)(propName) && codes === null);

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

const validatePayload = ({ nodeType, code, body: payload }) => {
	if (payload.code && payload.code !== code) {
		throw httpErrors(
			400,
			`Conflicting code property \`${
				payload.code
			}\` in payload for ${nodeType} ${code}`
		);
	}

	Object.entries(payload).forEach(([propName, value]) => {
		const realPropName = stripNegation(propName);
		validation.validatePropertyName(realPropName);
		validation.validateProperty(nodeType, realPropName, value);
	});
};

const containsRelationshipData = (type, payload) => {
	const { properties: validProperties } = getType(type);
	return Object.entries(getType(type).properties)
		.filter(([propName]) => isRelationship(validProperties)(propName))
		.some(([propName]) => propName in payload || `!${propName}` in payload);
};

const getWriteProperties = (type, payload, code) => {
	const { properties: validProperties } = getType(type);

	payload.code = code || payload.code;

	return Object.entries(payload)
		.filter(isProperty(validProperties))
		.filter(([, val]) => val !== null)
		.reduce(entriesToObject, {});
};

const getDeleteProperties = (type, payload) => {
	const { properties: validProperties } = getType(type);

	return Object.entries(payload)
		.filter(isProperty(validProperties))
		.filter(([, val]) => val === null)
		.map(([key]) => key);
};

const getWriteRelationships = (type, payload) => {
	const { properties: validProperties } = getType(type);
	return Object.entries(payload)
		.filter(isWriteRelationship(validProperties))
		.map(([propName, codes]) => [propName, toArray(codes)])
		.reduce(entriesToObject, {});
};

const getDeleteRelationships = (type, payload) => {
	const { properties: validProperties } = getType(type);
	return Object.entries(payload)
		.filter(isDeleteRelationship(validProperties))
		.map(([propName, codes]) => [
			codes ? stripNegation(propName) : propName,
			codes ? toArray(codes) : null
		])
		.reduce(entriesToObject, {});
};

module.exports = {
	validateParams,
	validatePayload,
	containsRelationshipData,
	getWriteProperties,
	getWriteRelationships,
	getDeleteProperties,
	getDeleteRelationships
};
