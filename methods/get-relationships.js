const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');
const deepFreeze = require('deep-freeze');

const restRelationships = relationships => {
	return relationships.reduce(
		(
			obj,
			{ neo4jName, direction, endNode, hasMany, name, description, label }
		) => {
			obj[neo4jName] = obj[neo4jName] || [];
			obj[neo4jName].push({
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
	neo4jName,
	endNode,
	isRecursive
}) => ({
	type: endNode,
	hasMany,
	direction,
	name,
	isRecursive: !!isRecursive,
	isRelationship: true,
	neo4jName,
	description,
	label
});

const graphqlRelationships = relationships => {
	return relationships.filter(({ hidden }) => !hidden).reduce((arr, def) => {
		arr.push(createGraphqlRelationship(def));
		return arr;
	}, []);
};

const normalize = (propName, def, typeName) => {
	const obj = Object.assign({}, def, {
		endNode: def.type,
		hasMany: !!def.hasMany,
		name: propName,
		neo4jName: def.relationship,
		startNode: typeName
	});

	delete obj.relationship;
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
