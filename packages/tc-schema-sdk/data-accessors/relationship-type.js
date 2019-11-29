const TreecreeperUserError = require('../lib/biz-ops-error');
const {
	assignMetaProperties,
	transformPrimitiveTypes,
} = require('../lib/property-assign');

const BIZ_OPS = 'biz-ops';

const transformRichRelationship = (
	rootType,
	property,
	{ name, from, to, relationship, properties },
) => {
	const { direction } = property;
	let relationshipTo;
	let hasMany;
	let dest;
	if (direction !== 'to' && from.type === rootType) {
		dest = 'outgoing';
		relationshipTo = to.type;
		hasMany = !!to.hasMany;
	} else {
		dest = 'incoming';
		relationshipTo = from.type;
		hasMany = !!from.hasMany;
	}
	return {
		...property,
		type: relationshipTo,
		from: from.type,
		to: to.type,
		direction: dest,
		properties: { ...properties },
		name,
		relationship,
		hasMany,
	};
};

const getFromTo = (direction, rootType, otherType) =>
	direction === 'outgoing' ? [rootType, otherType] : [otherType, rootType];

const getFromRawData = (rootType, propertyName, rawData) => {
	const types = rawData.getTypes();
	const type = types.find(t => t.name === rootType);

	if (!type) {
		throw new TreecreeperUserError(
			`Invalid relationship type \`${rootType}\``,
		);
	}

	const property = type.properties[propertyName];

	if (!property) {
		throw new TreecreeperUserError(
			`${rootType} doesn't have ${propertyName} property`,
		);
	}

	if ('relationship' in property) {
		const [from, to] = getFromTo(
			property.direction,
			rootType,
			property.type,
		);
		return {
			...property,
			from,
			to,
		};
	}
	const richRelationshipType = rawData
		.getRelationshipTypes()
		.find(relType => relType.name === property.type);

	if (richRelationshipType) {
		return transformRichRelationship(
			rootType,
			property,
			richRelationshipType,
		);
	}
	throw new TreecreeperUserError(
		`${propertyName} property in ${rootType} is not a relationship`,
	);
};

const cacheKeyGenerator = (
	rootType,
	propertyName,
	{ primitiveTypes = BIZ_OPS, includeMetaFields = false } = {},
) =>
	`relationships:${rootType}:${propertyName}:${primitiveTypes}:${includeMetaFields}`;

const getRelationshipType = function(
	rootType,
	propertyName,
	{
		primitiveTypes = BIZ_OPS, // graphql
		includeMetaFields = false,
	},
) {
	const relationshipType = getFromRawData(
		rootType,
		propertyName,
		this.rawData,
	);
	if (!('properties' in relationshipType)) {
		relationshipType.properties = {};
	}
	let properties = { ...relationshipType.properties };

	if (includeMetaFields && Object.keys(relationshipType.properties).length) {
		properties = assignMetaProperties(properties, '_lockedFields');
	}
	properties = transformPrimitiveTypes(
		properties,
		primitiveTypes,
		this.getStringValidator,
	);

	return { ...relationshipType, properties };
};

module.exports = {
	accessor: getRelationshipType,
	cacheKeyGenerator,
};
