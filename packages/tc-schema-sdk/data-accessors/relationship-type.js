const TreecreeperUserError = require('../lib/biz-ops-error');
const {
	assignMetaProperties,
	transformPrimitiveTypes,
} = require('../lib/property-assign');

const BIZ_OPS = 'biz-ops';

const getFromTo = (direction, rootType, otherType) =>
	direction === 'outgoing' ? [rootType, otherType] : [otherType, rootType];

const isCypherQueryIncluded = property => 'cypher' in property;

const formatUserDefinedRelationship = (rootType, property) => {
	if (isCypherQueryIncluded(property)) {
		return { ...property };
	}
	const [from, to] = getFromTo(property.direction, rootType, property.type);
	return {
		...property,
		from,
		to,
	};
};

const formatRichRelationship = (
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

const getTypeProperty = (rootType, propertyName, rawData) => {
	const type = rawData.getTypes().find(typeDef => typeDef.name === rootType);
	if (!type) {
		throw new TreecreeperUserError(
			`Invalid relationship type \`${rootType}\``,
		);
	}

	return type.properties[propertyName];
};

const isUserDefinedRelationship = property =>
	['relationship', 'cypher'].some(propName => propName in property);

const getRichRelationshipDefinition = ({ type }, rawData) =>
	rawData.getRelationshipTypes().find(({ name }) => name === type);

const getRelationshipTypeFromRawData = (rootType, propertyName, rawData) => {
	const property = getTypeProperty(rootType, propertyName, rawData);
	if (!property) {
		throw new TreecreeperUserError(
			`${rootType} doesn't have ${propertyName} property`,
		);
	}

	if (isUserDefinedRelationship(property)) {
		return formatUserDefinedRelationship(rootType, property);
	}
	const richRelationshipDefinition = getRichRelationshipDefinition(
		property,
		rawData,
	);
	if (richRelationshipDefinition) {
		return formatRichRelationship(
			rootType,
			property,
			richRelationshipDefinition,
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
	} = {},
) {
	const relationshipType = getRelationshipTypeFromRawData(
		rootType,
		propertyName,
		this.rawData,
	);
	// if relationshipType has cypher field, it cannot have from/to direction and properties
	// because it can only express relationship via cypher query
	if (isCypherQueryIncluded(relationshipType)) {
		return relationshipType;
	}
	let properties = { ...(relationshipType.properties || {}) };

	if (includeMetaFields && Object.keys(properties).length) {
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
