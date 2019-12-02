const schema = require('@financial-times/tc-schema-sdk');

const invertDirection = direction =>
	direction === 'incoming' ? 'outgoing' : 'incoming';

const findPropertyName = ({
	sourceType,
	destinationType,
	relationship,
	direction,
}) => {
	const { properties: sourceProperties } = schema.getType(sourceType);
	const [propName] = Object.entries(sourceProperties).find(
		([, definition]) =>
			definition.type === destinationType &&
			definition.relationship === relationship &&
			definition.direction === direction,
	);
	return propName;
};

const findInversePropertyName = (rootType, propName) => {
	const { type, relationship, direction } = schema.getType(
		rootType,
	).properties[propName];

	return findPropertyName({
		sourceType: type,
		direction: invertDirection(direction),
		relationship,
		destinationType: rootType,
	});
};

const generateRelatedEvents = ({
	rootType,
	getEventType,
	getUpdatedProperties,
	relationships,
}) => {
	const { properties } = schema.getType(rootType);
	return Object.entries(relationships).reduce((events, [propName, codes]) => {
		codes.forEach(code => {
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
	}, []);
};

const makeAddedRelationshipEvents = (
	nodeType,
	mainCode,
	neo4jRecords,
	addedRelationships = {},
	requestId,
) => {
	if (!Object.keys(addedRelationships).length) {
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
			const updatedProperty = findInversePropertyName(rootType, propName);
			return isCreated(type, code)
				? ['code', updatedProperty].sort()
				: [updatedProperty];
		},
		relationships: addedRelationships,
	});
};

const makeRemovedRelationshipEvents = (nodeType, removedRelationships = {}) =>
	console.log(nodeType, removedRelationships) ||
	generateRelatedEvents({
		rootType: nodeType,
		getEventType: () => 'UPDATE',
		getUpdatedProperties: ({ rootType, propName }) => [
			findInversePropertyName(rootType, propName),
		],
		relationships: removedRelationships,
	});

module.exports = {
	makeAddedRelationshipEvents,
	makeRemovedRelationshipEvents,
};
