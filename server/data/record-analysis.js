const httpErrors = require('http-errors');
const { getType } = require('@financial-times/biz-ops-schema');
const neo4jTemporalTypes = require('neo4j-driver/lib/v1/temporal-types');

const isNullValue = ([, val]) => val === null || val === '';

const isNotNullValue = entry => !isNullValue(entry);

const isTemporalTypeName = type => ['Date', 'DateTime', 'Time'].includes(type);

const toArray = val => (Array.isArray(val) ? val : [val]);

const toArrayOrUndefined = it =>
	typeof it === 'undefined' ? undefined : toArray(it);

const arrDiff = (arr1, arr2) =>
	toArray(arr1).filter(item => !toArray(arr2).includes(item));

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

const unNegatePropertyName = propName => propName.replace(/^!/, '');

const maybeToObject = func => (input, asObject = true) =>
	asObject ? func(input).reduce(entriesToObject, {}) : func(input);

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

const detectPropertyChanges = (nodeType, initialContent) => {
	// // don't mutate the original object
	// initialContent = Object.assign({}, initialContent)
	if (!initialContent || !Object.keys(initialContent).length) {
		return () => true;
	}

	const { properties } = getType(nodeType);
	return ([propName, val]) => {
		const { type } = properties[propName];

		if (isTemporalTypeName(type)) {
			// takes care of the case when we're writing a temporal type for the first time
			if (!initialContent[propName]) {
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
					.fromStandardDate(new Date(initialContent[propName]))
					.toString()
			);
		}

		return val !== initialContent[propName];
	};
};

const diffProperties = maybeToObject(
	({ nodeType, newContent = {}, initialContent = {} }) => {
		return Object.entries(newContent)
			.filter(isProperty(nodeType))
			.filter(isNotNullValue)
			.filter(detectPropertyChanges(nodeType, initialContent));
	},
);

const avoidSimultaneousWriteAndDelete = (
	relationshipsToCreate,
	deleteRelationships,
) => {
	Object.entries(relationshipsToCreate).forEach(([propName, codes]) => {
		if (
			deleteRelationships[propName] &&
			deleteRelationships[propName].some(code => codes.includes(code))
		) {
			throw httpErrors(
				400,
				'Trying to add and remove a relationship to a record at the same time',
			);
		}
	});
};

const diffRelationships = ({
	nodeType,
	initialContent = {},
	newContent,
	action = 'merge',
}) => {
	const newRelationships = Object.entries(newContent)
		.filter(isWriteRelationship(nodeType))
		.map(([propName, codes]) => [propName, toArray(codes)])
		.reduce(entriesToObject, {});
	const deleteRelationships = Object.entries(newContent)
		.filter(isDeleteRelationship(nodeType))
		.map(([propName, codesToDelete]) => [
			codesToDelete ? unNegatePropertyName(propName) : propName,
			codesToDelete ? toArray(codesToDelete) : null,
		])
		.reduce(entriesToObject, {});

	avoidSimultaneousWriteAndDelete(newRelationships, deleteRelationships);

	const schema = getType(nodeType);
	const summary = Object.entries(newRelationships)
		.map(([relType, newCodes]) => {
			const isCardinalityOne = !schema.properties[relType].hasMany;
			if (isCardinalityOne && newCodes.length > 1) {
				throw httpErrors(400, `Can only have one ${relType}`);
			}
			const existingCodes = initialContent[relType];
			if (!existingCodes && newCodes.length) {
				return [relType, { added: newCodes }];
			}
			const newCodesOnly = arrDiff(newCodes, existingCodes);
			const existingCodesOnly = arrDiff(existingCodes, newCodes);
			if (newCodesOnly.length || existingCodesOnly.length) {
				return [
					relType,
					{
						added: newCodesOnly,
						removed:
							action === 'replace' || isCardinalityOne
								? existingCodesOnly
								: undefined,
					},
				];
			}
			return [];
		})
		.filter(([relType]) => !!relType)
		.concat(
			Object.entries(deleteRelationships).map(([relType, codes]) => [
				relType,
				{
					removed: codes
						? toArray(codes).filter(code =>
								(initialContent[relType] || []).includes(code),
						  )
						: toArrayOrUndefined(initialContent[relType]),
				},
			]),
		);

	return {
		addedRelationships: summary
			.filter(([, { added = [] }]) => added.length)
			.map(([relType, { added }]) => [relType, added])
			.reduce(entriesToObject, {}),
		removedRelationships: summary
			.filter(([, { removed = [] }]) => removed.length)
			.map(([relType, { removed }]) => [relType, removed])
			.reduce(entriesToObject, {}),
	};
};

const containsRelationshipData = (nodeType, payload) => {
	const isRelationship = identifyRelationships(nodeType);
	return Object.entries(getType(nodeType).properties)
		.filter(([propName]) => isRelationship(propName))
		.some(([propName]) => propName in payload || `!${propName}` in payload);
};

const diffNullProperties = maybeToObject(
	({ nodeType, newContent, initialContent = {} }) => {
		return Object.entries(newContent)
			.filter(isProperty(nodeType))
			.filter(isNullValue)
			.filter(
				([propName]) =>
					propName in initialContent &&
					isNotNullValue([undefined, initialContent[propName]]),
			);
	},
);

module.exports = {
	diffRelationships,
	diffProperties,
	diffNullProperties,
	containsRelationshipData,
};
