const clone = require('clone');
const primitiveTypesMap = require('../lib/primitive-types-map');
const metaProperties = require('../lib/constants');

const BIZ_OPS = 'biz-ops';

const entriesArrayToObject = arr =>
	arr.reduce((obj, [name, val]) => Object.assign(obj, { [name]: val }), {});

const hydrateFieldsets = (properties, fieldsets = {}, includeMetaFields) => {
	const fieldsetEntries = Object.entries(fieldsets);

	const hasRealFieldsets = !!fieldsetEntries.length;

	fieldsetEntries.push([
		'misc',
		{
			heading: hasRealFieldsets ? 'Miscellaneous' : 'General',
		},
	]);

	if (includeMetaFields) {
		fieldsetEntries.push(['meta', { heading: 'Metadata' }]);
	}

	properties.forEach(([prop, def]) => {
		const { fieldset } = def;
		if (fieldset === 'self') {
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
			const [, targetFieldset] = fieldsetEntries.find(
				([name]) => name === (fieldset || 'misc'),
			);
			targetFieldset.properties = targetFieldset.properties || [];
			targetFieldset.properties.push([prop, def]);
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

const cacheKeyHelper = (
	typeName,
	{
		primitiveTypes = BIZ_OPS,
		withRelationships = true,
		groupProperties = false,
		includeMetaFields = false,
	} = {},
) =>
	`types:${typeName}:${withRelationships}:${groupProperties}:${includeMetaFields}:${primitiveTypes}`;

const getFromRawData = (typeName, rawData) => {
	const typeDefinition = rawData
		.getTypes()
		.find(type => type.name === typeName);

	if (!typeDefinition) {
		throw new Error(`Invalid type ${typeName}`);
	}

	return clone(typeDefinition);
};

const getType = (
	rawData,
	getStringValidator,
	typeName,
	{
		primitiveTypes = BIZ_OPS, // graphql
		withRelationships = true,
		groupProperties = false,
		includeMetaFields = false,
	} = {},
) => {
	const typeSchema = getFromRawData(typeName, rawData);

	typeSchema.type = typeSchema.name;

	if (!('properties' in typeSchema)) {
		typeSchema.properties = {};
	}

	if (!typeSchema.pluralName) {
		typeSchema.pluralName = `${typeSchema.name}s`;
	}

	if (withRelationships) {
		Object.entries(typeSchema.properties).forEach(([propName, def]) => {
			if (def.relationship) {
				if (def.hidden) {
					delete typeSchema.properties[propName];
				}
				Object.assign(def, {
					hasMany: def.hasMany || false,
					isRelationship: !!def.relationship,
					isRecursive: def.isRecursive || false,
				});
			}
		});
	} else {
		Object.entries(typeSchema.properties).forEach(([propName, def]) => {
			if (def.relationship) {
				delete typeSchema.properties[propName];
			}
		});
	}
	if (includeMetaFields) {
		metaProperties.forEach(metaProperty => {
			typeSchema.properties[metaProperty.name] = metaProperty;
		});
	}
	const properties = Object.entries(typeSchema.properties)
		.map(([name, def]) => {
			if (primitiveTypes === 'graphql') {
				if (def.type === 'Document') {
					// documents are too big to be served by graphql
					return;
				}
				// If not a primitive type we assume it's an enum and leave it unaltered
				def.type = primitiveTypesMap[def.type] || def.type;
			}
			if (def.pattern) {
				def.validator = getStringValidator(def.pattern);
			}
			return [name, def];
		})
		.filter(entry => !!entry);

	if (groupProperties) {
		typeSchema.fieldsets = hydrateFieldsets(
			properties,
			typeSchema.fieldsets,
			includeMetaFields,
		);
		delete typeSchema.properties;
	} else {
		typeSchema.properties = entriesArrayToObject(properties);
	}

	return typeSchema;
};

module.exports = {
	accessor: getType,
	cacheKeyHelper,
};
