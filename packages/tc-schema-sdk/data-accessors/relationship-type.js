const primitiveTypesMap = require('../lib/primitive-types-map');
const metaProperties = require('../lib/meta-properties');
const TreecreeperUserError = require('../lib/biz-ops-error');

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
	if (from.type === to.type && !direction) {
		throw new TreecreeperUserError(
			`Cannot determine the relationship direction for ${name} of ${rootType}`,
		);
	}
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
			`Invalid relationship type \`${rootType}`,
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
	const richRelationshipType = types.find(
		t => t.name === property.type && t.from && t.to,
	);
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
	if (includeMetaFields && Object.keys(relationshipType.properties).length) {
		metaProperties
			.filter(meta => meta.name !== '_lockedFields')
			.forEach(meta => {
				relationshipType.properties[meta.name] = meta;
			});
	}
	relationshipType.properties = Object.entries(relationshipType.properties)
		.map(([name, def]) => {
			const cloned = { ...def };
			if (primitiveTypes === 'graphql') {
				cloned.type = primitiveTypesMap[def.type] || def.type;
			}
			if (def.pattern) {
				cloned.validator = this.getStringValidator(def.pattern);
			}
			return [name, cloned];
		})
		.filter(entry => !!entry)
		.reduce((obj, [name, def]) => ({ ...obj, [name]: def }), {});

	return relationshipType;
};

module.exports = {
	accessor: getRelationshipType,
	cacheKeyGenerator,
};
