const defineRelationshipOnNode = ({
	nodeType,
	cypherName,
	direction,
	graphql: { name, description, recursiveName, recursiveDescription },
	hasMany
}) => ({
	name,
	type: nodeType,
	hasMany,
	underlyingRelationship: cypherName,
	direction,
	description,
	recursiveName,
	recursiveDescription
});

const buildTwinRelationships = ({
	map,
	cypherName,
	type,
	fromType,
	toType
}) => {
	const startNode = fromType.type;
	const endNode = toType.type;

	map[startNode] = map[startNode] || [];
	map[startNode].push(
		defineRelationshipOnNode({
			nodeType: endNode,
			cypherName,
			direction: 'OUT',
			graphql: obj ? obj.graphql : {},
			hasMany: /MANY$/.test(type)
		})
	);

	Object.entries(toType).forEach(([nodeType, obj]) => {
		map[nodeType] = map[nodeType] || [];
		startNodes.forEach(startNode => {
			map[nodeType].push(
				defineRelationshipOnNode({
					nodeType: startNode,
					cypherName,
					direction: 'IN',
					graphql: obj ? obj.graphql : {},
					hasMany: /^MANY/.test(type)
				})
			);
		});
	});
};

const byNodeType = relationships =>
	Object.entries(relationships).reduce((map, [cypherName, definitions]) => {
		if (!Array.isArray(definitions)) {
			definitions = [definitions];
		}

		definitions.map(({ type, fromType, toType }) => {
			buildTwinRelationships({
				map,
				cypherName,
				type,
				fromType,
				toType
			});
		});
		return map;
	}, {});

module.exports = { byNodeType };
