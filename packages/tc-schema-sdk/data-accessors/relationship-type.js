const clone = require('clone');
const primitiveTypesMap = require('../lib/primitive-types-map');
const metaProperties = require('../lib/meta-properties');
const TreecreeperUserError = require('../lib/biz-ops-error');

const BIZ_OPS = 'biz-ops';

const getFromRawData = (rootType, propertyName, rawData) => {
	const type = rawData.getTypes().find(t => t.name === rootType);

	if (!type) {
		throw new TreecreeperUserError(`Invalid type \`${rootType}`);
	}

	const relationshipProperty = type.properties[propertyName];

	if (!relationshipProperty) {
		throw new TreecreeperUserError(
			`${rootType} doesn't have ${propertyName} property`,
		);
	} else if (!('relationship' in relationshipProperty)) {
		throw new TreecreeperUserError(
			`${propertyName} property in ${rootType} is not a relationship`,
		);
	}

	return clone(relationshipProperty);
};

const cacheKeyGenerator = (
	rootType,
	propertyName,
	{ primitiveTypes = BIZ_OPS, includeMetaFields = false } = {},
) =>
	`relationships:${rootType}:${propertyName}:${primitiveTypes}:${includeMetaFields}`;

const getRelationshipType = (
	rootType,
	propertyName,
	{
		primitiveTypes = BIZ_OPS, // graphql
		includeMetaFields = false,
	},
) => {
	const relationshipSchema = getFromRawData(
		rootType,
		propertyName,
		this.rawData,
	);
	if (!('properties' in relationshipSchema)) {
		relationshipSchema.properties = {};
	}
	if (includeMetaFields) {
		metaProperties
			.filter(meta => meta.name !== '_lockedFields')
			.forEach(meta => {
				relationshipSchema.properties[meta.name] = meta;
			});
	}
	relationshipSchema.properties = Object.entries(
		relationshipSchema.properties,
	)
		.map(([name, def]) => {
			if (primitiveTypes === 'graphql') {
				def.type = primitiveTypesMap[def.type] || def.type;
			}
			if (def.pattern) {
				def.validator = this.getStringValidator(def.pattern);
			}
			return [name, def];
		})
		.filter(entry => !!entry)
		.reduce((obj, [name, def]) => ({ ...obj, [name]: def }), {});

	return relationshipSchema;
};

module.exports = {
	accessor: getRelationshipType,
	cacheKeyGenerator,
};
