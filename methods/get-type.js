const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');
const getRelationships = require('./get-relationships');
const deepFreeze = require('deep-freeze');
const clone = require('clone');
const getStringValidator = require('../lib/get-string-validator');
const primitiveTypesMap = require('../lib/primitive-types-map');

const exitArray = arr => arr.reduce((obj, [name, val]) => Object.assign(obj, { [name]: val }), {})

const getType = (
	typeName,
	{
		primitiveTypes = 'biz-ops', // graphql
		relationshipStructure = false, // flat, rest, graphql
		groupProperties = false
	} = {}
) => {
	let type = rawData.getTypes().find(type => type.name === typeName);
	if (!type) {
		return;
	}
	type = clone(type);

	if (!('properties' in type)) {
		type.properties = {};
	}
	if (!type.pluralName) {
		type.pluralName = `${type.name}s`;
	}

	if (relationshipStructure) {
		const relationships = getRelationships.method(type.name, {
			structure: relationshipStructure
		});
		if (relationshipStructure === 'graphql') {
			relationships.forEach(def => {
				type.properties[def.name] = def;
			});
		} else {
			type.relationships = relationships;
		}
	}

	const properties = Object.entries(
		type.properties
	)
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
		.filter(entry => !!entry)

	if (!groupProperties) {
		type.properties = exitArray(properties);
	} else {



		const virtualSectionProperties = properties
			.filter(([,{section}]) => section === 'self')

		const realSectionProperties = properties
			.filter(([,{section}]) => section && section !== 'self')

		const miscProperties = properties
			.filter(([,{section}]) => !section)

		const realSections = Object.entries(type.sections)
			.map(([sectionName, sectionDef]) => {
				sectionDef.properties = exitArray(realSectionProperties
					.filter(([,{section}]) => section === sectionName))

				return [sectionName, sectionDef];
			})

		const virtualSections = virtualSectionProperties
				.map(([propertyName, propertyDef]) => {
					return [propertyName, {
						heading: propertyDef.label,
						description: propertyDef.description,
						properties: {[propertyName]: propertyDef}
					}]
				})

		const miscellaneous = [['misc', {
			heading: 'Miscellaneous',
			properties: exitArray(miscProperties)
		}]]

		type.sections = exitArray([].concat(
			realSections,
			virtualSections,
			miscellaneous
		))

		delete type.properties;
	}

	return deepFreeze(type);
};

module.exports.method = cache.cacheify(
	getType,
	(typeName, { relationshipStructure = false, groupProperties = false } = {}) =>
		`types:${typeName}:${relationshipStructure}:${groupProperties}`
);
