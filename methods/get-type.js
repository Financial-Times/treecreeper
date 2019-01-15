const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');
const deepFreeze = require('deep-freeze');
const clone = require('clone');
const getStringValidator = require('../lib/get-string-validator');
const primitiveTypesMap = require('../lib/primitive-types-map');
const metaProperties = require('./constants');

const META = 'meta';

const entriesArrayToObject = arr =>
	arr.reduce((obj, [name, val]) => Object.assign(obj, { [name]: val }), {});

const getType = (
	typeName,
	{
		primitiveTypes = 'biz-ops', // graphql
		withRelationships = true,
		groupProperties = false
	} = {}
) => {
	let type = rawData.getTypes().find(type => type.name === typeName);
	if (!type) {
		return;
	}
	type = clone(type);
	type.type = type.name;

	if (!('properties' in type)) {
		type.properties = {};
	}
	if (!type.pluralName) {
		type.pluralName = `${type.name}s`;
	}

	if (!withRelationships) {
		Object.entries(type.properties).forEach(([propName, def]) => {
			if (def.relationship) {
				delete type.properties[propName];
			}
		});
	} else {
		Object.entries(type.properties).forEach(([propName, def]) => {
			if (def.relationship) {
				if (def.hidden) {
					delete type.properties[propName];
				}
				Object.assign(def, {
					hasMany: def.hasMany || false,
					isRelationship: !!def.relationship,
					isRecursive: def.isRecursive || false
				});
			}
		});
	}

	metaProperties.forEach(metaProperty => {
		type.properties[metaProperty.name] = {
			type: metaProperty.type,
			description: metaProperty.description,
			label: metaProperty.label,
			fieldset: META,
			autoPopulated: true
		};
	});

	const properties = Object.entries(type.properties)
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
		type.properties = entriesArrayToObject(properties);
	} else {
		const virtualFieldsetProperties = properties.filter(
			([, { fieldset }]) => fieldset === 'self'
		);

		const realFieldsetProperties = properties.filter(
			([, { fieldset }]) => fieldset && fieldset !== 'self'
		);

		const miscProperties = properties.filter(([, { fieldset }]) => !fieldset);

		const metaProperties = properties.filter(
			([, { fieldset }]) => fieldset && fieldset === META
		);

		const realFieldsets = Object.entries(type.fieldsets || {})
			.map(([fieldsetName, fieldsetDef]) => {
				fieldsetDef.properties = entriesArrayToObject(
					realFieldsetProperties.filter(
						([, { fieldset }]) => fieldset === fieldsetName
					)
				);

				return [fieldsetName, fieldsetDef];
			})
			.filter(([, { properties }]) => !!Object.keys(properties).length);

		const virtualFieldsets = virtualFieldsetProperties.map(
			([propertyName, propertyDef]) => {
				return [
					propertyName,
					{
						heading: propertyDef.label,
						description: propertyDef.description,
						isSingleField: true,
						properties: { [propertyName]: propertyDef }
					}
				];
			}
		);

		const fieldsetUp = (fieldsetName, heading, properties) => {
			return [
				[
					fieldsetName,
					{
						heading,
						properties: entriesArrayToObject(properties)
					}
				]
			];
		};

		const miscHeading = realFieldsets.length ? 'Miscellaneous' : 'General';
		const miscellaneous = miscProperties.length
			? fieldsetUp('misc', miscHeading, miscProperties)
			: [];

		const metaFieldSets = metaProperties.length
			? fieldsetUp(META, 'Meta Data', metaProperties)
			: [];

		type.fieldsets = entriesArrayToObject(
			[].concat(realFieldsets, virtualFieldsets, miscellaneous, metaFieldSets)
		);

		delete type.properties;
	}

	return deepFreeze(type);
};

module.exports = cache.cacheify(
	getType,
	(
		typeName,
		{
			primitiveTypes = 'biz-ops',
			withRelationships = true,
			groupProperties = false
		} = {}
	) =>
		`types:${typeName}:${withRelationships}:${groupProperties}:${primitiveTypes}`
);
