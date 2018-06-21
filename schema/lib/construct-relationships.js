const readYaml = require('./read-yaml');

const relationships = readYaml.file('schema/rules/relationships.yaml');

const defineRelationshipOnNode = ({
	nodeType,
	cypherName,
	direction,
	graphql: { name, description, depth },
	hasMany
}) => ({
	name,
	type: nodeType,
	hasMany,
	underlyingRelationship: cypherName,
	direction,
	description,
	depth
});

const buildTwinRelationships = ({
	map,
	cypherName,
	type,
	fromType,
	toType
}) => {
	const startNodes = Object.keys(fromType);
	const endNodes = Object.keys(toType);

	Object.entries(fromType).forEach(([nodeType, obj]) => {
		map[nodeType] = map[nodeType] || [];
		endNodes.forEach(endNode => {
			map[nodeType].push(
				defineRelationshipOnNode({
					nodeType: endNode,
					cypherName,
					direction: 'OUT',
					graphql: obj.graphql,
					hasMany: /MANY$/.test(type)
				})
			);
		});
	});

	Object.entries(toType).forEach(([nodeType, obj]) => {
		map[nodeType] = map[nodeType] || [];
		startNodes.forEach(startNode => {
			map[nodeType].push(
				defineRelationshipOnNode({
					nodeType: startNode,
					cypherName,
					direction: 'IN',
					graphql: obj.graphql,
					hasMany: /^MANY/.test(type)
				})
			);
		});
	});
};

const byNodeType = Object.entries(relationships).reduce(
	(map, [cypherName, definitions]) => {
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
	},
	{}
);

module.exports = byNodeType;
