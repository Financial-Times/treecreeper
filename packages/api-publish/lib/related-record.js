const schema = require('../../schema-sdk');

const findPropertyNames = (
	sourceType,
	destinationType,
	relationship,
	direction,
) => {
	const { properties: sourceProperties } = schema.getType(sourceType);
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

const attachProperties = (
	{ relatedCode, relatedType },
	nodeType,
	updatedPropertyNames,
) => {
	const { properties } = schema.getType(relatedType);
	const relatedProperties = updatedPropertyNames
		.filter(name => name in properties)
		.reduce((relates, name) => {
			const {
				isRelationship,
				direction,
				relationship,
				type,
			} = properties[name];
			const props = isRelationship
				? findPropertyNames(nodeType, type, relationship, direction)
				: [name];
			return relates.conact(props);
		}, []);

	return {
		relatedCode,
		relatedType,
		relatedProperties,
	};
};

const findRelatedRecords = (records, mainCode, updatedProperties) =>
	records
		.map(record => record.get('node'))
		.filter(node => node)
		.map(node => ({
			relatedCode: node.relatedCode(),
			relatedType: node.relatedType(),
		}))
		.filter(
			({ relatedCode, relatedType }) =>
				relatedCode && relatedType && relatedCode !== mainCode,
		)
		.map(relatedCode =>
			attachProperties(relatedCode, mainCode, updatedProperties),
		);

module.exports = {
	findRelatedRecords,
};
