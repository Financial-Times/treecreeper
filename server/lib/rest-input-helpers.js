const httpErrors = require('http-errors');
const { getType } = require('@financial-times/biz-ops-schema');
const neo4jTemporalTypes = require('neo4j-driver/lib/v1/temporal-types');
const validation = require('./schema-validation');

const isNullValue = ([, val]) => val === null || val === '';

const isNotNullValue = entry => !isNullValue(entry);

const isTemporalType = type => ['Date', 'DateTime', 'Time'].includes(type);

const toArray = val => (Array.isArray(val) ? val : [val]);

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

const unNegatePropertyName = propName => propName.replace(/^!/, '');

const identifyRelationships = nodeType => {
	const { properties } = getType(nodeType);
	return propName => properties[propName].relationship;
};

const isProperty = nodeType => {
	const isRelationship = identifyRelationships(nodeType);
	return ([propName]) => !isRelationship(unNegatePropertyName(propName));
};

const isWriteRelationship = nodeType => {
	const isRelationship = identifyRelationships(nodeType);
	return ([propName, codes]) =>
		propName.charAt(0) !== '!' &&
		isRelationship(propName) &&
		codes !== null;
};

const isDeleteRelationship = nodeType => {
	const isRelationship = identifyRelationships(nodeType);
	return ([propName, codes]) =>
		(propName.charAt(0) === '!' &&
			isRelationship(unNegatePropertyName(propName))) ||
		(isRelationship(propName) && codes === null);
};

const containsRelationshipData = (nodeType, payload) => {
	const isRelationship = identifyRelationships(nodeType);
	return Object.entries(getType(nodeType).properties)
		.filter(([propName]) => isRelationship(propName))
		.some(([propName]) => propName in payload || `!${propName}` in payload);
};

const convertTemporalTypes = nodeType => {
	const { properties } = getType(nodeType);
	return ([propName, val]) => {
		const { type } = properties[propName];
		if (isTemporalType(type)) {
			val = neo4jTemporalTypes[type].fromStandardDate(new Date(val));
		}
		return [propName, val];
	};
};

const detectPropertyChanges = (nodeType, diffContent) => {
	if (!diffContent || !Object.keys(diffContent).length) {
		return () => true;
	}

	const { properties } = getType(nodeType);
	return ([propName, val]) => {
		const { type } = properties[propName];

		if (isTemporalType(type)) {
			// takes care of the case when we're writing a temporal type for the first time
			if (!diffContent[propName]) {
				return true;
			}
			const constructor = neo4jTemporalTypes[type];
			// We go to extra lengths here using constructors because the string representations
			// in the payload and retrieved from db may have different precision, but effectively
			// be the same value e.g. 12:00:00 compared to 12:00:00.000 should return false
			// What a pollava!
			return (
				constructor.fromStandardDate(new Date(val)).toString() !==
				constructor
					.fromStandardDate(new Date(diffContent[propName]))
					.toString()
			);
		}

		return val !== diffContent[propName];
	};
};

const getWriteProperties = (nodeType, payload, code, diffContent) => {
	payload.code = code || payload.code;

	return Object.entries(payload)
		.filter(isProperty(nodeType))
		.filter(isNotNullValue)
		.filter(detectPropertyChanges(nodeType, diffContent))
		.map(convertTemporalTypes(nodeType))
		.reduce(entriesToObject, {});
};

const getDeleteProperties = (nodeType, payload) => {
	return Object.entries(payload)
		.filter(isProperty(nodeType))
		.filter(isNullValue)
		.map(([key]) => key);
};

const getWriteRelationships = (nodeType, payload) => {
	return Object.entries(payload)
		.filter(isWriteRelationship(nodeType))
		.map(([propName, codes]) => [propName, toArray(codes)])
		.reduce(entriesToObject, {});
};

const getDeleteRelationships = (nodeType, payload) => {
	return Object.entries(payload)
		.filter(isDeleteRelationship(nodeType))
		.map(([propName, codesToDelete]) => [
			codesToDelete ? unNegatePropertyName(propName) : propName,
			codesToDelete ? toArray(codesToDelete) : null,
		])
		.reduce(entriesToObject, {});
};

const validateParams = ({ nodeType, code }) => {
	// TODO: move these into middleware
	validation.validateTypeName(nodeType);
	validation.validateCode(nodeType, code);
};

const validatePayload = ({ nodeType, code, body: payload }) => {
	if (payload.code && payload.code !== code) {
		throw httpErrors(
			400,
			`Conflicting code property \`${
				payload.code
			}\` in payload for ${nodeType} ${code}`,
		);
	}

	Object.entries(payload).forEach(([propName, value]) => {
		const realPropName = unNegatePropertyName(propName);
		validation.validatePropertyName(realPropName);
		validation.validateProperty(nodeType, realPropName, value);
	});
};

module.exports = {
	validateParams,
	validatePayload,
	containsRelationshipData,
	getWriteProperties,
	getDeleteProperties,
	getWriteRelationships,
	getDeleteRelationships,
};
