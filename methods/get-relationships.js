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
	return relationships.reduce((arr, def) => {
		arr.push(createGraphqlRelationship(def));
		return arr;
	}, []);
};

const buildTwinRelationships = ({
	neo4jName,
	cardinality,
	fromType,
	toType
}) => {
	const startNode = fromType.type;
	const endNode = toType.type;

	return [
		Object.assign({}, fromType, {
			startNode,
			endNode,
			neo4jName,
			direction: 'outgoing',
			hasMany: /MANY$/.test(cardinality)
		}),
		Object.assign({}, toType, {
			startNode: endNode,
			endNode: startNode,
			neo4jName,
			direction: 'incoming',
			hasMany: /^MANY/.test(cardinality)
		})
	].map(obj => {
		delete obj.type;
		return obj;
	});
};

const getNormalizedRawData = cache.cacheify(
	() => {
		return deepFreeze(
			Object.entries(rawData.getRelationships()).reduce(
				(configsList, [neo4jName, definitions]) => {
					if (!Array.isArray(definitions)) {
						definitions = [definitions];
					}
					return configsList.concat(
						definitions.map(definition =>
							Object.assign({ neo4jName }, definition)
						)
					);
				},
				[]
			)
		);
	},
	() => 'relationships:normalizedRawData'
);

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
		.filter(([key, { relationship }]) => !!relationship)
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
