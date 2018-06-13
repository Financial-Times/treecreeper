const readYaml = require('./lib/read-yaml');
const typesSchema = readYaml.directory('schema/types');
const relationshipsSchema = require('./lib/construct-relationships');
const stringPatternsRaw = readYaml.file('schema/rules/string-patterns.yaml');

const stringPatterns = Object.entries(stringPatternsRaw).reduce(
	(map, [name, def]) => {
		if (typeof def === 'string') {
			def = { pattern: def };
		}
		map[name] = new RegExp(def.pattern, def.flags);
		return map;
	},
	{}
);

const getPlural = typeConfig => typeConfig.pluralName || `${typeConfig.name}s`;

const getIdentifyingFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canIdentify);

const getFilteringFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canFilter);

const getNeo4jResolverNames = () => {
	return [].concat(
		...typesSchema.map(type => {
			const arr = [];
			if (getIdentifyingFields(type).length) {
				arr.push(type.name);
			}
			if (getFilteringFields(type).length) {
				arr.push(getPlural(type));
			}
			return arr;
		})
	);
};

typesSchema.forEach(type => {
	Object.entries(type.properties).forEach(([propName, entry]) => {
		if (entry.pattern) {
			type.properties[propName].pattern = stringPatterns[entry.pattern];
		} else if (propName === 'code') {
			type.properties.code.pattern = stringPatterns.CODE;
		}
	});
});

module.exports = {
	getNeo4jResolverNames,
	getIdentifyingFields,
	getFilteringFields,
	getPlural,
	typesSchema,
	relationshipsSchema,
	enumsSchema: readYaml.file('schema/rules/enums.yaml'),
	stringPatterns
};
