const neo4jTemporalTypes = require('neo4j-driver/lib/v1/temporal-types');
const { getType } = require('../../../packages/schema-sdk');

const isNullValue = val => val === null || val === '';

const isTemporalTypeName = type => ['Date', 'DateTime', 'Time'].includes(type);

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

// We go to extra lengths here using constructors because the string representations
// in the payload and retrieved from db may have different precision, but effectively
// be the same value e.g. 12:00:00 compared to 12:00:00.000 should return false
const normalizeDateString = (date, neo4jConstructor) =>
	neo4jConstructor.fromStandardDate(new Date(date)).toString();

const datesAreEqual = (date1, date2, neo4jConstructor) =>
	normalizeDateString(date1, neo4jConstructor) ===
	normalizeDateString(date2, neo4jConstructor);

const isProperty = type => {
	const { properties } = getType(type);
	return ([propName]) =>
		properties[propName] && !properties[propName].isRelationship;
};

const getPropertyChangeDetector = (properties, initialContent) => ([
	propName,
	val,
]) => {
	const { type } = properties[propName] || {};

	if (!(propName in initialContent)) {
		return !isNullValue(val);
	}

	if (isNullValue(val)) {
		return true;
	}

	if (isTemporalTypeName(type)) {
		return !datesAreEqual(
			val,
			initialContent[propName],
			neo4jTemporalTypes[type],
		);
	}

	return val !== initialContent[propName];
};

const detectPropertyChanges = (type, initialContent = {}) => {
	if (!Object.keys(initialContent).length) {
		return ([, val]) => !isNullValue(val);
	}

	const { properties } = getType(type);

	return getPropertyChangeDetector(properties, initialContent);
};

const diffProperties = ({ type, newContent = {}, initialContent = {} }) =>
	Object.entries(newContent)
		.filter(isProperty(type))
		.filter(detectPropertyChanges(type, initialContent))
		.reduce(entriesToObject, {});

module.exports = {
	diffProperties,
};
