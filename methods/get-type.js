const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');
const getRelationships = require('./get-relationships');
const deepFreeze = require('deep-freeze');
const clone = require('clone');
const getStringValidator = require('../lib/get-string-validator');
const primitiveTypesMap = require('../lib/primitive-types-map');

const getType = (
	typeName,
	{
		primitiveTypes = 'biz-ops', // graphql
		relationshipStructure = false // flat, rest, graphql
		// groupProperties = false
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

	type.properties = Object.entries(type.properties)
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
		.reduce((obj, [name, def]) => Object.assign(obj, { [name]: def }), {});

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
	return deepFreeze(type);
};

module.exports.method = cache.cacheify(
	getType,
	(typeName, { relationshipStructure = false, groupProperties = false } = {}) =>
		`types:${typeName}:${relationshipStructure}:${groupProperties}`
);
