const neo4jTemporalTypes = require('neo4j-driver/lib/v1/temporal-types');
const { getType } = require('../../../../../schema');

const isNullValue = val => val === null || val === '';

const isTemporalTypeName = type => ['Date', 'DateTime', 'Time'].includes(type);

const toArray = val => (Array.isArray(val) ? val : [val]);

const entryHasValues = ([, values = []]) => values.length;

const arrDiff = (arr1, arr2) =>
	toArray(arr1).filter(item => !toArray(arr2).includes(item));

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

const unNegatePropertyName = propName => propName.replace(/^!/, '');

const maybeToObject = func => (input, asObject = true) =>
	asObject ? func(input).reduce(entriesToObject, {}) : func(input);

// We go to extra lengths here using constructors because the string representations
// in the payload and retrieved from db may have different precision, but effectively
// be the same value e.g. 12:00:00 compared to 12:00:00.000 should return false
const normalizeDateString = (date, neo4jConstructor) =>
	neo4jConstructor.fromStandardDate(new Date(date)).toString();

const datesAreEqual = (date1, date2, neo4jConstructor) =>
	normalizeDateString(date1, neo4jConstructor) ===
	normalizeDateString(date2, neo4jConstructor);

const identifyRelationships = nodeType => {
	const { properties } = getType(nodeType);
	return propName =>
		properties[propName] && properties[propName].isRelationship;
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

const detectPropertyChanges = (nodeType, initialContent = {}) => {
	if (!Object.keys(initialContent).length) {
		return ([, val]) => !isNullValue(val);
	}

	const { properties } = getType(nodeType);

	return ([propName, val]) => {
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
};

const diffProperties = maybeToObject(
	({ nodeType, newContent = {}, initialContent = {} }) => {
		return Object.entries(newContent)
			.filter(isProperty(nodeType))
			.filter(detectPropertyChanges(nodeType, initialContent));
	},
);

const findActualDeletions = initialContent => ([propName, codesToDelete]) => {
	const realPropName = unNegatePropertyName(propName);
	const isDeleteAll = realPropName === propName && codesToDelete === null;
	return [
		realPropName,
		toArray(
			isDeleteAll ? initialContent[realPropName] : codesToDelete,
		).filter(code => (initialContent[realPropName] || []).includes(code)),
	];
};

const findImplicitDeletions = (initialContent, schema, action) => ([
	relType,
	newCodes,
]) => {
	const isCardinalityOne = !schema.properties[relType].hasMany;
	if (action === 'replace' || isCardinalityOne) {
		const existingCodes = initialContent[relType];
		if (!existingCodes) {
			return;
		}
		const existingCodesOnly = arrDiff(existingCodes, toArray(newCodes));
		if (existingCodesOnly.length) {
			return [relType, existingCodesOnly];
		}
	}
};

const findActualAdditions = initialContent => ([relType, newCodes]) => [
	relType,
	arrDiff(newCodes, initialContent[relType]),
];

const getRemovedRelationships = ({
	nodeType,
	initialContent,
	newContent,
	action,
}) => {
	if (!initialContent) {
		return {};
	}

	const schema = getType(nodeType);

	// deletes because of a replace action or because the relationship
	// is a __-to-one
	const implicitDeletes = Object.entries(newContent)
		.filter(isWriteRelationship(nodeType))
		.map(findImplicitDeletions(initialContent, schema, action))
		.filter(it => !!it);

	// deletes explictly expressed using the payload null and ! conventions
	const explictDeletes = Object.entries(newContent)
		.filter(isDeleteRelationship(nodeType))
		.map(findActualDeletions(initialContent));

	return implicitDeletes
		.concat(explictDeletes)
		.filter(entryHasValues)
		.reduce(entriesToObject, {});
};

const getAddedRelationships = ({ nodeType, initialContent, newContent }) => {
	let newRelationships = Object.entries(newContent)
		.filter(isWriteRelationship(nodeType))
		.map(([propName, codes]) => [propName, toArray(codes)]);

	if (initialContent) {
		newRelationships = newRelationships
			.map(findActualAdditions(initialContent))
			.filter(entryHasValues);
	}

	return newRelationships.reduce(entriesToObject, {});
};

const containsRelationshipData = (nodeType, payload) => {
	const isRelationship = identifyRelationships(nodeType);
	return Object.entries(getType(nodeType).properties)
		.filter(([propName]) => isRelationship(propName))
		.some(([propName]) => propName in payload || `!${propName}` in payload);
};

module.exports = {
	getAddedRelationships,
	getRemovedRelationships,
	diffProperties,
	containsRelationshipData,
};
