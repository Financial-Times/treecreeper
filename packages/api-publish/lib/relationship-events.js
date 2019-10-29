const schema = require('../../schema-sdk');

const invertDirection = direction =>
	direction === 'incoming' ? 'outgoing' : 'incoming';

const findPropertyNames = ({
	sourceType,
	destinationType,
	relationship,
	direction,
	inverse = false,
}) => {
	const { properties: sourceProperties } = schema.getType(sourceType);
	direction = inverse ? invertDirection(direction) : direction;
	return Object.entries(sourceProperties)
		.filter(
			([, definition]) =>
				definition.type === destinationType &&
				definition.relationship === relationship &&
				definition.direction === direction,
		)
		.map(([propName]) => propName)
		.sort();
};

const makeAddedRelationshipEvents = (
	nodeType,
	mainCode,
	neo4jRecords,
	addedRelationships,
) => {
	if (!Object.keys(addedRelationships).length) {
		return [];
	}
	const createdNodes = neo4jRecords
		.filter(
			record => record.get('node') && record.relatedCode() !== mainCode,
		)
		.map(node => ({
			relatedCode: node.relatedCode(),
			relatedType: node.relatedType(),
		}));

	const { properties } = schema.getType(nodeType);
	return Object.entries(properties)
		.filter(([name]) => name in addedRelationships)
		.reduce((events, [name, { type, direction, relationship }]) => {
			const updatedProperties = findPropertyNames({
				sourceType: nodeType,
				destinationType: type,
				relationship,
				direction,
			});

			addedRelationships[name].forEach(code => {
				const isCreated = createdNodes.some(
					({ relatedCode, relatedType }) =>
						type === relatedType && code === relatedCode,
				);
				events.push({
					action: isCreated ? 'CREATE' : 'UPDATE',
					code,
					type,
					updatedProperties: isCreated
						? ['code'].concat(updatedProperties).sort()
						: updatedProperties,
				});
			});
			return events;
		}, []);
};

const makeRemovedRelationshipEvents = (
	nodeType,
	properties,
	removedRelationships,
) =>
	Object.entries(removedRelationships).reduce((events, [propName, codes]) => {
		codes.forEach(removedCode => {
			const { type, relationship, direction } = properties[propName];
			events.push({
				action: 'UPDATE',
				code: removedCode,
				type,
				updatedRemovedProperties: findPropertyNames({
					sourceType: nodeType,
					destinationType: type,
					relationship,
					direction,
					inverse: true,
				}),
			});
		});
		return events;
	}, []);

module.exports = {
	makeAddedRelationshipEvents,
	makeRemovedRelationshipEvents,
};
