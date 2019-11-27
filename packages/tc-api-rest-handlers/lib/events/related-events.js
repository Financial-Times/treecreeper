const schema = require('@financial-times/tc-schema-sdk');
const { getContext } = require('@financial-times/tc-api-express-logger');

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

const makeAddedRelationshipEvents = (
	nodeType,
	mainCode,
	neo4jRecords,
	addedRelationships,
) => {
	if (!Object.keys(addedRelationships).length) {
		return [];
	}
	const { requestId } = getContext();
	const createdNodes = neo4jRecords
		.filter(record => record.get('related._createdByRequest') === requestId)
		.map(node => ({
			relatedCode: node.relatedCode(),
			relatedType: node.relatedType(),
		}));

	const isCreatedNode = (type, code) =>
		createdNodes.some(
			({ relatedCode, relatedType }) =>
				type === relatedType && code === relatedCode,
		);

	const { properties } = schema.getType(nodeType);
	return Object.entries(addedRelationships)
		.reduce((events, [propName, codes]) => {
			const { type } = properties[propName];

			const updatedProperty = findInversePropertyName(nodeType, propName);

			codes.forEach(code => {
				const isCreated = isCreatedNode(type, code);
				events.push({
					action: isCreated ? 'CREATE' : 'UPDATE',
					code,
					type,
					updatedProperties: isCreated
						? ['code', updatedProperty].sort()
						: [updatedProperty],
				});
			});
			return events;
		}, []);
};

const makeRemovedRelationshipEvents = (nodeType, removedRelationships) => {
	const { properties } = schema.getType(nodeType);

	return Object.entries(removedRelationships).reduce(
		(events, [propName, codes]) => {
			codes.forEach(removedCode => {
				const { type } = properties[propName];
				events.push({
					action: 'UPDATE',
					code: removedCode,
					type,
					updatedProperties: [
						findInversePropertyName(nodeType, propName),
					],
				});
			});
			return events;
		},
		[],
	);
};

module.exports = {
	makeAddedRelationshipEvents,
	makeRemovedRelationshipEvents,
};
