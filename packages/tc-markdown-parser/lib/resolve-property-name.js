const normalizePropertyKey = require('./normalize-property-key');

module.exports = function resolveTreecreeperPropertyName({
	heading,
	properties,
}) {
	const normalizedHeading = normalizePropertyKey(heading);
	const propertyEntries = Object.entries(properties);
	return propertyEntries.find(([key, property]) => {
		return (
			key === heading ||
			property.label === heading ||
			normalizePropertyKey(key) === normalizedHeading ||
			normalizePropertyKey(property.label) === normalizedHeading
		);
	});
};
