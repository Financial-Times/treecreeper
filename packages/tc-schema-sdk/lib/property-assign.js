const metaProperties = require('./meta-properties');

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

const transformPrimitiveTypes = (properties, getStringValidator) => {
	const propertyEntries = Object.entries(properties)
		.map(([name, def]) => [name, { ...def }])
		.map(([name, def]) => {
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
