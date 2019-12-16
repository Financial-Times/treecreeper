const primitiveTypesMap = require('../lib/primitive-types-map');
const metaProperties = require('../lib/meta-properties');

const assignMetaProperties = (properties, { ignoreFields = [] } = {}) => {
	metaProperties.forEach(metaProperty => {
		if (ignoreFields.includes(metaProperty.name)) {
			return;
		}
		properties[metaProperty.name] = metaProperty;
	});
	return properties;
};

const entriesArrayToObject = arr =>
	arr.reduce((obj, [name, val]) => Object.assign(obj, { [name]: val }), {});

const transformPrimitiveTypes = (
	properties,
	primitiveTypes,
	getStringValidator,
) => {
	const propertyEntries = Object.entries(properties)
		.map(([name, def]) => [name, { ...def }])
		.map(([name, def]) => {
			if (primitiveTypes === 'graphql') {
				// If not a primitive type we assume it's an enum and leave it unaltered
				def.type = primitiveTypesMap[def.type] || def.type;
			}
			if (def.pattern) {
				def.validator = getStringValidator(def.pattern);
			}
			return [name, def];
		});

	return entriesArrayToObject(propertyEntries);
};

module.exports = {
	assignMetaProperties,
	transformPrimitiveTypes,
};
