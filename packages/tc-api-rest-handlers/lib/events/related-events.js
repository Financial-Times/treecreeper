const schema = require('@financial-times/tc-schema-sdk');

const generateRelatedEvents = ({
	rootType,
	getEventType,
	getUpdatedProperties,
	relationships,
}) => {
	const { properties } = schema.getType(rootType);
	return Object.entries(relationships).reduce(
		(events, [propName, relatedEntities]) => {
			if (!Array.isArray(relatedEntities)) {
				relatedEntities = [relatedEntities];
			}
			relatedEntities.forEach(entity => {
				const code = typeof entity === 'string' ? entity : entity.code;
				const { type } = properties[propName];
				events.push({
					action: getEventType(type, code),
					code,
					type,
					updatedProperties: getUpdatedProperties({
						rootType,
						propName,
						type,
						code,
					}),
				});
			});
			return events;
		},
		[],
	);
};

const makeAddedRelationshipEvents = (
	nodeType,
	mainCode,
	neo4jRecords,
	changedRelationships = {},
	requestId,
) => {
	if (!Object.keys(changedRelationships).length) {
		return [];
	}

	const createdNodes = new Set(
		neo4jRecords
			.filter(
				record => record.get('related._createdByRequest') === requestId,
			)
			.map(node => `${node.relatedType()}:${node.relatedCode()}`),
	);

	const isCreated = (type, code) => createdNodes.has(`${type}:${code}`);

	return generateRelatedEvents({
		rootType: nodeType,
		getEventType: (type, code) =>
			isCreated(type, code) ? 'CREATE' : 'UPDATE',
		getUpdatedProperties: ({ rootType, propName, type, code }) => {
			const updatedProperties = schema.findInversePropertyNames(
				rootType,
				propName,
			);
			return isCreated(type, code)
				? updatedProperties.concat(['code']).sort()
				: updatedProperties;
		},
		relationships: changedRelationships,
	});
};

const makeRemovedRelationshipEvents = (nodeType, removedRelationships = {}) =>
	generateRelatedEvents({
		rootType: nodeType,
		getEventType: () => 'UPDATE',
		getUpdatedProperties: ({ rootType, propName }) =>
			schema.findInversePropertyNames(rootType, propName),

		relationships: removedRelationships,
	});

module.exports = {
	makeAddedRelationshipEvents,
	makeRemovedRelationshipEvents,
};
