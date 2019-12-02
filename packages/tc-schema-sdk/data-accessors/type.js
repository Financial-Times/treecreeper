const clone = require('clone');
const TreecreeperUserError = require('../lib/biz-ops-error');
const {
	assignMetaProperties,
	transformPrimitiveTypes,
} = require('../lib/property-assign');

const BIZ_OPS = 'biz-ops';

const entriesArrayToObject = arr =>
	arr.reduce((obj, [name, val]) => Object.assign(obj, { [name]: val }), {});

const isUserDefinedRelationship = propDef =>
	['relationship', 'cypher'].some(name => name in propDef);

const isRichRelationship = (richRelationshipTypes, propDef) =>
	richRelationshipTypes.find(relType => relType.name === propDef.type);

const isRelationship = (richRelationshipTypes, propDef) =>
	isUserDefinedRelationship(propDef) ||
	isRichRelationship(richRelationshipTypes, propDef);

const hydrateFieldsets = ({
	properties,
	fieldsets = {},
	includeMetaFields,
	useMinimumViableRecord,
	minimumViableRecord = [],
}) => {
	const fieldsetEntries = Object.entries(fieldsets);

	const hasRealFieldsets = !!fieldsetEntries.length;

	fieldsetEntries.push([
		'misc',
		{
			heading: hasRealFieldsets ? 'Miscellaneous' : 'General',
		},
	]);

	if (useMinimumViableRecord && minimumViableRecord.length) {
		fieldsetEntries.unshift([
			'minimumViableRecord',
			{ heading: 'Minimum viable record' },
		]);
	}

	if (includeMetaFields) {
		fieldsetEntries.push(['meta', { heading: 'Metadata' }]);
	}

	const insertIntoFieldset = (fieldsetName = 'misc', prop, def) => {
		const [, targetFieldset] = fieldsetEntries.find(
			([name]) => name === fieldsetName,
		);

		targetFieldset.properties = targetFieldset.properties || [];
		targetFieldset.properties.push([prop, def]);
	};

	Object.entries(properties).forEach(([prop, def]) => {
		const { fieldset } = def;

		if (useMinimumViableRecord && minimumViableRecord.includes(prop)) {
			insertIntoFieldset('minimumViableRecord', prop, def);
		} else if (fieldset === 'self') {
			fieldsetEntries.push([
				prop,
				{
					heading: def.label,
					description: def.description,
					isSingleField: true,
					properties: [[prop, def]],
				},
			]);
		} else {
			insertIntoFieldset(fieldset, prop, def);
		}
	});

	return entriesArrayToObject(
		fieldsetEntries
			.filter(([, { properties: props }]) => props && props.length)
			.map(([prop, def]) => {
				def.properties = entriesArrayToObject(def.properties);
				return [prop, def];
			}),
	);
};

const getFromRawData = (typeName, rawData) => {
	const typeDefinition = rawData
		.getTypes()
		.find(type => type.name === typeName);

	if (!typeDefinition) {
		throw new TreecreeperUserError(`Invalid type \`${typeName}\``);
	}

	return clone(typeDefinition);
};

const assignRelationshipInfo = propDef => ({
	...propDef,
	hasMany: propDef.hasMany || false,
	isRelationship: isUserDefinedRelationship(propDef),
	writeInactive: 'writeInactive' in propDef ? propDef.writeInactive : false,
	showInactive: 'showInactive' in propDef ? propDef.showInactive : true,
});

const createPropertiesWithRelationships = function(
	richRelationshipTypes,
	properties,
	relationshipGetter,
) {
	return Object.entries(properties).reduce(
		(updatedProps, [propName, propDef]) => {
			if (isRelationship(richRelationshipTypes, propDef)) {
				propDef = relationshipGetter(propName);
			}

			if (isUserDefinedRelationship(propDef)) {
				if (propDef.hidden) {
					return updatedProps;
				}
				propDef = assignRelationshipInfo(propDef);
			}
			return {
				...updatedProps,
				[propName]: propDef,
			};
		},
		{},
	);
};

const createPropertiesWithoutRelationships = function(
	richRelationshipTypes,
	properties,
	relationshipGetter,
) {
	return Object.entries(properties).reduce(
		(updatedProps, [propName, propDef]) => {
			if (isRelationship(richRelationshipTypes, propDef)) {
				propDef = relationshipGetter(propName);
			}
			if (propDef.relationship) {
				return updatedProps;
			}
			return {
				...updatedProps,
				[propName]: propDef,
			};
		},
		{},
	);
};

const cacheKeyGenerator = (
	typeName,
	{
		primitiveTypes = BIZ_OPS,
		withRelationships = true,
		groupProperties = false,
		includeMetaFields = false,
		useMinimumViableRecord = false,
	} = {},
) =>
	`types:${typeName}:${withRelationships}:${groupProperties}:${includeMetaFields}:${primitiveTypes}:${useMinimumViableRecord}`;

const getType = function(
	typeName,
	{
		primitiveTypes = BIZ_OPS, // graphql
		withRelationships = true,
		groupProperties = false,
		includeMetaFields = false,
		useMinimumViableRecord = false,
	} = {},
) {
	const typeSchema = getFromRawData(typeName, this.rawData);

	typeSchema.type = typeSchema.name;

	if (!('properties' in typeSchema)) {
		typeSchema.properties = {};
	}

	if (!typeSchema.pluralName) {
		typeSchema.pluralName = `${typeSchema.name}s`;
	}

	if (typeSchema.properties.code) {
		Object.assign(typeSchema.properties.code, {
			type: 'Code',
			required: true,
			unique: true,
			canIdentify: true,
			useInSummary: true,
		});
	}

	let properties = { ...typeSchema.properties };
	const richRelationshipTypes = this.rawData.getRelationshipTypes();
	const relationshipGetter = propName =>
		this.getRelationshipType(
			typeSchema.name,
			propName,
			richRelationshipTypes,
			{
				primitiveTypes,
				includeMetaFields,
			},
		);

	if (withRelationships) {
		properties = createPropertiesWithRelationships(
			richRelationshipTypes,
			properties,
			relationshipGetter,
		);
	} else {
		properties = createPropertiesWithoutRelationships(
			richRelationshipTypes,
			properties,
			relationshipGetter,
		);
	}

	if (includeMetaFields) {
		properties = assignMetaProperties(properties);
	}
	properties = transformPrimitiveTypes(
		properties,
		primitiveTypes,
		this.getStringValidator,
	);

	if (groupProperties) {
		typeSchema.fieldsets = hydrateFieldsets({
			properties,
			fieldsets: typeSchema.fieldsets,
			includeMetaFields,
			useMinimumViableRecord,
			minimumViableRecord: typeSchema.minimumViableRecord,
		});
		delete typeSchema.properties;
	} else {
		typeSchema.properties = properties;
	}
	return typeSchema;
};

module.exports = {
	accessor: getType,
	cacheKeyGenerator,
};
