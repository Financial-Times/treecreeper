const clone = require('clone');
const stringValidator = require('./string-validator');
const primitiveTypesMap = require('../lib/primitive-types-map');
const metaProperties = require('../lib/constants');

const BIZ_OPS = 'biz-ops';
const SELF = 'self';

const entriesArrayToObject = arr =>
	arr.reduce((obj, [name, val]) => Object.assign(obj, { [name]: val }), {});

const arrangeFieldsets = (properties, fieldsets = {}, includeMetaFields) => {
	const virtualFieldsetProperties = properties.filter(
		([, { fieldset }]) => fieldset === SELF,
	);

	const realFieldsetProperties = properties.filter(
		([, { fieldset }]) => fieldset && fieldset !== SELF,
	);

	const miscProperties = properties.filter(([, { fieldset }]) => !fieldset);

	fieldsets = Object.entries(fieldsets);

	if (includeMetaFields) {
		fieldsets.push(['meta', { heading: 'Meta Data' }]);
	}

	const realFieldsets = fieldsets
		.map(([fieldsetName, fieldsetDef]) => {
			fieldsetDef.properties = entriesArrayToObject(
				realFieldsetProperties.filter(
					([, { fieldset }]) => fieldset === fieldsetName,
				),
			);

			return [fieldsetName, fieldsetDef];
		})
		/* eslint-disable no-shadow */
		.filter(([, { properties }]) => !!Object.keys(properties).length);

	const virtualFieldsets = virtualFieldsetProperties.map(
		([propertyName, propertyDef]) => {
			return [
				propertyName,
				{
					heading: propertyDef.label,
					description: propertyDef.description,
					isSingleField: true,
					properties: { [propertyName]: propertyDef },
				},
			];
		},
	);

	const miscellaneous = miscProperties.length
		? [
				[
					'misc',
					{
						heading:
							(includeMetaFields && realFieldsets.length > 1) ||
							(!includeMetaFields && realFieldsets.length)
								? 'Miscellaneous'
								: 'General',
						properties: entriesArrayToObject(miscProperties),
					},
				],
		  ]
		: [];

	return entriesArrayToObject(
		[].concat(realFieldsets, virtualFieldsets, miscellaneous),
	);
};

const cacheKeyHelper = (
	typeName,
	{
		primitiveTypes = BIZ_OPS,
		withRelationships = true,
		groupProperties = false,
		includeMetaFields = true,
	} = {},
) =>
	`types:${typeName}:${withRelationships}:${groupProperties}:${includeMetaFields}:${primitiveTypes}`;

const getType = (
	rawData,
	typeName,
	{
		primitiveTypes = BIZ_OPS, // graphql
		withRelationships = true,
		groupProperties = false,
		includeMetaFields = true,
	} = {},
) => {
	const getStringValidator = stringValidator(rawData);
	const typeDefinition = rawData
		.getTypes()
		.find(type => type.name === typeName);
	if (!typeDefinition) {
		return;
	}
	const enrichedType = clone(typeDefinition);

	enrichedType.type = typeDefinition.name;

	if (!('properties' in enrichedType)) {
		enrichedType.properties = {};
	}

	if (!enrichedType.pluralName) {
		enrichedType.pluralName = `${typeDefinition.name}s`;
	}

	if (!withRelationships) {
		Object.entries(enrichedType.properties).forEach(([propName, def]) => {
			if (def.relationship) {
				delete enrichedType.properties[propName];
			}
		});
	} else {
		Object.entries(enrichedType.properties).forEach(([propName, def]) => {
			if (def.relationship) {
				if (def.hidden) {
					delete enrichedType.properties[propName];
				}
				Object.assign(def, {
					hasMany: def.hasMany || false,
					isRelationship: !!def.relationship,
					isRecursive: def.isRecursive || false,
				});
			}
		});
	}

	metaProperties.forEach(metaProperty => {
		enrichedType.properties[metaProperty.name] = metaProperty;
	});

	const properties = Object.entries(enrichedType.properties)
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
		enrichedType.fieldsets = arrangeFieldsets(
			properties,
			enrichedType.fieldsets,
			includeMetaFields,
		);
		delete enrichedType.properties;
	} else {
		enrichedType.properties = entriesArrayToObject(properties);
	}

	return enrichedType;
};

module.exports = {
	accessor: getType,
	cacheKeyHelper,
};
