const { getType } = require('@financial-times/tc-schema-sdk');

const retrieveRelationshipCodes = (relType, content) =>
	content[relType] && content[relType].map(relationship => relationship.code);

const toArray = val => (Array.isArray(val) ? val : [val]);

const entryHasValues = ([, values = []]) => values.length;

const arrDiff = (arr1, arr2) =>
	toArray(arr1).filter(item => !toArray(arr2).includes(item));

const relationshipPropsDiff = (newRelationship, existingRelationship) => {
	const diffs = {};
	Object.keys(newRelationship).forEach(prop => {
		if (newRelationship[prop] === existingRelationship[prop]) {
			return;
		}
		if (newRelationship[prop] === null && !(prop in existingRelationship)) {
			return;
		}
		diffs[prop] = newRelationship[prop];
	});
	return diffs;
};

const getDiffs = (newRelationships, initialRelationships = []) => {
	if (!Array.isArray(initialRelationships)) {
		initialRelationships = [initialRelationships];
	}
	const allDiffs = [];

	newRelationships.forEach(newRelationship => {
		const existingRelationship = initialRelationships.find(
			initialRelationship =>
				initialRelationship.code === newRelationship.code,
		);

		if (!existingRelationship) {
			allDiffs.push(newRelationship);
		} else {
			const diffs = relationshipPropsDiff(
				newRelationship,
				existingRelationship,
			);
			if (Object.keys(diffs).length) {
				// code is needed for creating neo4j queries later
				diffs.code = newRelationship.code;
				allDiffs.push(diffs);
			}
		}
	});

	return allDiffs;
};

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

const unNegatePropertyName = propName => propName.replace(/^!/, '');

const identifyRelationships = type => {
	const { properties } = getType(type);
	return propName =>
		properties[propName] && properties[propName].isRelationship;
};

const isWriteRelationship = type => {
	const isRelationship = identifyRelationships(type);
	return ([propName, codes]) =>
		propName.charAt(0) !== '!' &&
		isRelationship(propName) &&
		codes !== null;
};

const isDeleteRelationship = type => {
	const isRelationship = identifyRelationships(type);
	return ([propName, codes]) =>
		(propName.charAt(0) === '!' &&
			isRelationship(unNegatePropertyName(propName))) ||
		(isRelationship(propName) && codes === null);
};

const findActualDeletions =
	initialContent =>
	([propName, newValues]) => {
		const codesToDelete = newValues && newValues.map(value => value.code);
		const realPropName = unNegatePropertyName(propName);
		const isDeleteAll = realPropName === propName && codesToDelete === null;
		const initialCodes = retrieveRelationshipCodes(
			realPropName,
			initialContent,
		);

		return [
			realPropName,
			toArray(isDeleteAll ? initialCodes : codesToDelete).filter(code =>
				(initialCodes || []).includes(code),
			),
		];
	};

const findImplicitDeletions =
	(initialContent, schema, action) =>
	([relType, newValues]) => {
		const newCodes = newValues.map(value => value.code);
		const isCardinalityOne = !schema.properties[relType].hasMany;
		if (action === 'replace' || isCardinalityOne) {
			const existingCodes = retrieveRelationshipCodes(
				relType,
				initialContent,
			);
			if (!existingCodes) {
				return;
			}
			const existingCodesOnly = arrDiff(existingCodes, toArray(newCodes));
			if (existingCodesOnly.length) {
				return [relType, existingCodesOnly];
			}
		}
	};

const findActualAdditions =
	initialContent =>
	([relType, newRelationships]) =>
		[relType, getDiffs(newRelationships, initialContent[relType])];

const getRemovedRelationships = ({
	type,
	initialContent,
	newContent,
	action,
}) => {
	if (!initialContent) {
		return {};
	}

	const schema = getType(type);

	// deletes because of a replace action or because the relationship
	// is a __-to-one
	const implicitDeletes = Object.entries(newContent)
		.filter(isWriteRelationship(type))
		.map(findImplicitDeletions(initialContent, schema, action))
		.filter(it => !!it);

	// deletes explictly expressed using the payload null and ! conventions
	const explictDeletes = Object.entries(newContent)
		.filter(isDeleteRelationship(type))
		.map(findActualDeletions(initialContent));

	return implicitDeletes
		.concat(explictDeletes)
		.filter(entryHasValues)
		.reduce(entriesToObject, {});
};

const getWriteRelationships = ({ type, body = {} }, reduce = true) => {
	const newRelationships = Object.entries(body)
		.filter(isWriteRelationship(type))
		.map(([propName, codes]) => [propName, toArray(codes)])
		.filter(([, codes]) => codes.length);

	return reduce
		? newRelationships.reduce(entriesToObject, {})
		: newRelationships;
};

const getChangedRelationships = ({ type, initialContent, newContent }) => {
	let newRelationships = getWriteRelationships(
		{ type, body: newContent },
		false,
	);

	if (initialContent) {
		newRelationships = newRelationships
			.map(findActualAdditions(initialContent))
			.filter(entryHasValues);
	}

	return newRelationships.reduce(entriesToObject, {});
};

const getAllRelationships = (type, payload = {}) => {
	const isRelationship = identifyRelationships(type);
	return Object.fromEntries(
		Object.entries(payload).filter(([propName]) =>
			isRelationship(propName),
		),
	);
};

const containsRelationshipData = (type, payload = {}) => {
	const isRelationship = identifyRelationships(type);
	return Object.entries(getType(type).properties)
		.filter(([propName]) => isRelationship(propName))
		.some(([propName]) => propName in payload || `!${propName}` in payload);
};

// relationship value could be just a String(code), an Object or an Array of strings(codes) / objects(code and properties) / mixed
// this function is to normalise them into an Array of objects
const normaliseRelationshipProps = (type, body = {}) => {
	const isRelationship = identifyRelationships(type);
	const relationships = Object.keys(body).filter(propName =>
		isRelationship(unNegatePropertyName(propName)),
	);

	relationships.forEach(relType => {
		const relValues = body[relType];

		if (relValues !== null) {
			if (typeof relValues === 'string') {
				body[relType] = [{ code: relValues }];
			} else if (Array.isArray(relValues)) {
				const normalisedRelValues = [];
				relValues.forEach(relValue =>
					typeof relValue === 'string'
						? normalisedRelValues.push({ code: relValue })
						: normalisedRelValues.push(relValue),
				);
				body[relType] = normalisedRelValues;
			} else {
				// when value is an object
				body[relType] = [relValues];
			}
		}
	});
};

module.exports = {
	getAllRelationships,
	getWriteRelationships,
	getChangedRelationships,
	getRemovedRelationships,
	containsRelationshipData,
	normaliseRelationshipProps,
	identifyRelationships,
	retrieveRelationshipCodes,
};
