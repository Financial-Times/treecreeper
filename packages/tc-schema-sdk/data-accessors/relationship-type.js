const TreecreeperUserError = require('../lib/biz-ops-error');
const {
	assignMetaProperties,
	transformPrimitiveTypes,
} = require('../lib/property-assign');

const BIZ_OPS = 'biz-ops';

const getFromTo = (direction, rootType, otherType) =>
	direction === 'outgoing' ? [rootType, otherType] : [otherType, rootType];

const isCypherQueryIncluded = property => 'cypher' in property;

const formatSimpleRelationship = (rootType, property, rawData) => {
	if (isCypherQueryIncluded(property)) {
		return { ...property };
	}

	const oppositeType = rawData
		.getTypes()
		.find(typeDef => typeDef.name === property.type);
	const oppositeProperty = Object.values(oppositeType.properties).find(
		({ direction, relationship, type }) =>
			direction !== property.direction &&
			relationship === property.relationship &&
			type === rootType,
	);

	const [from, to] = getFromTo(
		property.direction,
		{
			type: rootType,
			hasMany: !!oppositeProperty.hasMany,
		},
		{
			type: property.type,
			hasMany: !!property.hasMany,
		},
	);

	return {
		relationship: property.relationship,
		from,
		to,
		properties: {},
	};
};

const getTypeProperty = (rootType, propertyName, rawData) => {
	const type = rawData.getTypes().find(typeDef => typeDef.name === rootType);
	if (!type) {
		throw new TreecreeperUserError(
			`Invalid relationship type \`${rootType}\``,
		);
	}

	return type.properties[propertyName];
};

const isSimpleRelationship = property => 'relationship' in property;

const findRichRelationshipDefinition = ({ type }, rawData) =>
	rawData.getRelationshipTypes().find(({ name }) => name === type);

const getRelationshipTypeFromRawData = (rootType, propertyName, rawData) => {
	const property = getTypeProperty(rootType, propertyName, rawData);
	if (!property) {
		throw new TreecreeperUserError(
			`${rootType} doesn't have ${propertyName} property`,
		);
	}

	// TODO add a check to make sure we exit early here if is enum or primitive

	// if relationshipType has cypher field, it cannot have from/to direction and properties
	// because it can only express relationship via cypher query
	if (isCypherQueryIncluded(property)) {
		return;
	}

	if (isSimpleRelationship(property)) {
		return formatSimpleRelationship(rootType, property, rawData);
	}

	const richRelationshipDefinition = findRichRelationshipDefinition(
		property,
		rawData,
	);

	if (richRelationshipDefinition) {
		return richRelationshipDefinition;
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
	} = {},
) {
	const relationshipType = getRelationshipTypeFromRawData(
		rootType,
		propertyName,
		this.rawData,
	);

	if (!relationshipType) {
		return;
	}
	let properties = { ...(relationshipType.properties || {}) };

	if (includeMetaFields) {
		properties = assignMetaProperties(properties, {
			ignoreFields: '_lockedFields',
		});
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
