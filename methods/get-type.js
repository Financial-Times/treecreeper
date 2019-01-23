const deepFreeze = require('deep-freeze');
const clone = require('clone');
const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');
const getStringValidator = require('../lib/get-string-validator');
const primitiveTypesMap = require('../lib/primitive-types-map');
const metaProperties = require('./constants');

const META = 'meta';
const BIZ_OPS = 'biz-ops';
const SELF = 'self';

const entriesArrayToObject = arr =>
	arr.reduce((obj, [name, val]) => Object.assign(obj, { [name]: val }), {});

const getType = (
	typeName,
	{
		primitiveTypes = BIZ_OPS, // graphql
		withRelationships = true,
		groupProperties = false,
		includeMetaFields = true,
	} = {},
) => {
	const typeDefinition = rawData
		.getTypes()
		.find(type => type.name === typeName);
	if (!typeDefinition) {
		return;
	}
	const typeDefinitionResult = clone(typeDefinition);
	typeDefinitionResult.type = typeDefinition.name;

	if (!('properties' in typeDefinitionResult)) {
		typeDefinitionResult.properties = {};
	}
	if (!typeDefinitionResult.pluralName) {
		typeDefinitionResult.pluralName = `${typeDefinition.name}s`;
	}

	if (!withRelationships) {
		Object.entries(typeDefinitionResult.properties).forEach(
			([propName, def]) => {
				if (def.relationship) {
					delete typeDefinitionResult.properties[propName];
				}
			},
		);
	} else {
		Object.entries(typeDefinitionResult.properties).forEach(
			([propName, def]) => {
				if (def.relationship) {
					if (def.hidden) {
						delete typeDefinitionResult.properties[propName];
					}
					Object.assign(def, {
						hasMany: def.hasMany || false,
						isRelationship: !!def.relationship,
						isRecursive: def.isRecursive || false,
					});
				}
			},
		);
	}

	metaProperties.forEach(metaProperty => {
		typeDefinitionResult.properties[metaProperty.name] = {
			type: metaProperty.type,
			description: metaProperty.description,
			label: metaProperty.label,
			fieldset: META,
			autoPopulated: true,
		};
	});

	const properties = Object.entries(typeDefinitionResult.properties)
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

	if (!groupProperties) {
		typeDefinitionResult.properties = entriesArrayToObject(properties);
	} else {
		const virtualFieldsetProperties = properties.filter(
			([, { fieldset }]) => fieldset === SELF,
		);

		const realFieldsetProperties = properties.filter(
			([, { fieldset }]) => fieldset && fieldset !== SELF,
		);

		const miscProperties = properties.filter(
			([, { fieldset }]) => !fieldset,
		);

		const fieldsets = Object.entries(typeDefinitionResult.fieldsets || {});

		if (includeMetaFields) {
			fieldsets.push([META, { heading: 'Meta Data' }]);
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
								(includeMetaFields &&
									realFieldsets.length > 1) ||
								(!includeMetaFields && realFieldsets.length)
									? 'Miscellaneous'
									: 'General',
							properties: entriesArrayToObject(miscProperties),
						},
					],
			  ]
			: [];

		typeDefinitionResult.fieldsets = entriesArrayToObject(
			[].concat(realFieldsets, virtualFieldsets, miscellaneous),
		);

		delete typeDefinitionResult.properties;
	}

	return deepFreeze(typeDefinitionResult);
};

module.exports = cache.cacheify(
	getType,
	(
		typeName,
		{
			primitiveTypes = BIZ_OPS,
			withRelationships = true,
			groupProperties = false,
			includeMetaFields = true,
		} = {},
	) =>
		`types:${typeName}:${withRelationships}:${groupProperties}:${includeMetaFields}:${primitiveTypes}`,
);
