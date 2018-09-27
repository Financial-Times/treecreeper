const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');
const deepFreeze = require('deep-freeze');

const restRelationships = relationships => {
	return relationships.reduce(
		(
			obj,
			{ relationship, direction, endNode, hasMany, name, description, label }
		) => {
			obj[relationship] = obj[relationship] || [];
			obj[relationship].push({
				direction,
				nodeType: endNode,
				hasMany,
				name,
				description,
				label
			});
			return obj;
		},
		{}
	);
};

const createGraphqlRelationship = ({
	name,
	description,
	label,
	hasMany,
	direction,
	relationship,
	endNode,
	isRecursive
}) => ({
	type: endNode,
	hasMany,
	direction,
	name,
	isRecursive: !!isRecursive,
	isRelationship: true,
	relationship,
	description,
	label
});

const graphqlRelationships = relationships => {
	return relationships
		.filter(({ hidden }) => !hidden)
		.map(createGraphqlRelationship);
};

const normalize = (propName, def, typeName) => {
	const obj = Object.assign({}, def, {
		endNode: def.type,
		hasMany: !!def.hasMany,
		name: propName,
		startNode: typeName
	});

	delete obj.type;
	return obj;
};

const getRelationships = (
	typeName = undefined,
	{ structure = 'flat' } = {}
) => {
	const type = rawData.getTypes().find(({ name }) => name === typeName);
	let relationships = Object.entries(type.properties || {})
		.filter(([, { relationship }]) => !!relationship)
		.map(([key, val]) => normalize(key, val, typeName));

	if (structure === 'rest') {
		relationships = restRelationships(relationships);
	}

	if (structure === 'graphql') {
		relationships = graphqlRelationships(relationships);
	}
	return deepFreeze(relationships);
};

module.exports.method = cache.cacheify(
	getRelationships,
	(typeName = undefined, { structure = 'flat' } = {}) =>
		`relationships:${typeName}:${structure}`
);
