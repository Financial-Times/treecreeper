const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');

const groupRelationships = relationships => {
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

const graphqlRelationships = relationships => {
	return relationships.reduce(
		(
			arr,
			{
				neo4jName,
				direction,
				endNode,
				hasMany,
				name,
				description,
				label,
				recursiveName,
				recursiveDescription,
				recursiveLabel
			}
		) => {
			if (name) {
				arr.push({
					type: endNode,
					hasMany,
					name,
					isRecursive: false,
					isRelationship: true,
					neo4jName,
					description,
					label
				});
			}
			if (recursiveName) {
				arr.push({
					type: endNode,
					hasMany,
					name: recursiveName,
					isRecursive: true,
					isRelationship: true,
					neo4jName,
					description: recursiveDescription,
					label: recursiveLabel
				});
			}

			return arr;
		},
		[]
	);
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
module.exports.method = (
	typeName = undefined,
	{ direction = undefined, structure = 'flat' } = {}
) => {
	let relationships = cache.get(
		'relationships',
		`${typeName}:${direction}:${structure}`
	);

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

		relationships =
			structure === 'grouped'
				? groupRelationships(relationships)
				: structure === 'graphql'
					? graphqlRelationships(relationships)
					: relationships;
	}

	return relationships;

	// return byNodeType(rawData.getRelationships())[typeName]
};
