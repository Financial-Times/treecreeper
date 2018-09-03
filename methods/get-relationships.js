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

const createGraphqlRelationship = (
	{ name, description, label },
	isRecursive,
	{ hasMany, direction, neo4jName, endNode }
) => ({
	type: endNode,
	hasMany,
	direction,
	name,
	isRecursive,
	isRelationship: true,
	neo4jName,
	description,
	label
});

const graphqlRelationships = relationships => {
	return relationships.reduce((arr, def) => {
		if (def.name) {
			arr.push(createGraphqlRelationship(def, false, def));
		}
		if (def.recursiveName) {
			arr.push(
				createGraphqlRelationship(
					{
						name: def.recursiveName,
						description: def.recursiveDescription,
						label: def.recursiveLabel
					},
					true,
					def
				)
			);
		}
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

const getNormalizedRawData = () => {
	let normalizedRelationships = cache.get('relationships', `normalizedRawData`);
	if (!normalizedRelationships) {
		normalizedRelationships = Object.entries(rawData.getRelationships()).reduce(
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
		);
		cache.set('relationships', `normalizedRawData`, normalizedRelationships);
	}

	return normalizedRelationships;
};

module.exports.method = (typeName = undefined, { structure = 'flat' } = {}) => {
	let relationships = cache.get('relationships', `${typeName}:${structure}`);

	if (!relationships) {
		relationships = getNormalizedRawData()
			.filter(({ fromType, toType }) =>
				[fromType.type, toType.type].includes(typeName)
			)
			.reduce(
				(list, definition) => list.concat(buildTwinRelationships(definition)),
				[]
			)
			.filter(({ startNode }) => startNode === typeName);

		if (structure === 'rest') {
			relationships = restRelationships(relationships);
		}

		if (structure === 'graphql') {
			relationships = graphqlRelationships(relationships);
		}
		relationships = deepFreeze(relationships);

		cache.set('relationships', `${typeName}:${structure}`, relationships);
	}

	return relationships;
};
