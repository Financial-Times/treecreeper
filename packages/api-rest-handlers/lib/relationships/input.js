const { getType } = require('../../../../packages/schema-sdk');

const toArray = val => (Array.isArray(val) ? val : [val]);

const entryHasValues = ([, values = []]) => values.length;

const arrDiff = (arr1, arr2) =>
	toArray(arr1).filter(item => !toArray(arr2).includes(item));

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

const unNegatePropertyName = propName => propName.replace(/^!/, '');

const identifyRelationships = nodeType => {
	const { properties } = getType(nodeType);
	return propName =>
		properties[propName] && properties[propName].isRelationship;
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

const getRelationships = ({ type, body = {} }, reduce = true) => {
	const newRelationships = Object.entries(body)
		.filter(isWriteRelationship(type))
		.map(([propName, codes]) => [propName, toArray(codes)]);

	return reduce
		? newRelationships.reduce(entriesToObject, {})
		: newRelationships;
};

const getAddedRelationships = ({ type, initialContent, newContent }) => {
	let newRelationships = getRelationships({ type, body: newContent }, false);

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
	getRelationships,
	getAddedRelationships,
	getRemovedRelationships,
	containsRelationshipData,
};
