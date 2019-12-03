const normalizePropertyKey = require('./normalize-property-key');

module.exports = function resolveBizopsPropertyName({
	heading,
	systemProperties,
}) {
	const normalizedHeading = normalizePropertyKey(heading);
	const propertyEntries = Object.entries(systemProperties);
	return propertyEntries.find(([key, property]) => {
		return (
			key === heading ||
			property.label === heading ||
			normalizePropertyKey(key) === normalizedHeading ||
			normalizePropertyKey(property.label) === normalizedHeading
		);
	});
};
