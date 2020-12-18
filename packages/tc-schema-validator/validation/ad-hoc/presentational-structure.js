const assert = require('assert');
const sdk = require('../sdk');

const validatePresentationalStructure = () => {
	const types = sdk.rawData.getTypes();

	const hierarchy = sdk.rawData.getTypeHierarchy();

	// Check each type appears in the type hierarchy
	// AJV has already checked that _only_ valid types are in the hierarchy
	const typeNames = types.map(type => type.name);
	const flattenedHierarchy = Object.values(hierarchy).flatMap(
		category => category.types,
	);
	const absentTypes = typeNames.filter(
		name => !flattenedHierarchy.includes(name),
	);

	if (absentTypes.length) {
		assert.fail(
			`${absentTypes.join(
				', ',
			)} types are not included in type-hierarchy.yaml`,
		);
	}

	// Check all properties in all types reference valid fieldset names
	const badFieldsets = types
		.flatMap(type => {
			const fieldsets = ['self'].concat(
				Object.keys(type.fieldsets || {}),
			);
			const badProperties = Object.entries(type.properties).filter(
				([, { fieldset }]) => fieldset && !fieldsets.includes(fieldset),
			);

			return (
				badProperties.length && {
					type: type.name,
					fieldsets,
					badProperties,
				}
			);
		})
		.filter(x => !!x);

	if (badFieldsets.length) {
		badFieldsets.forEach(({ type, fieldsets, badProperties }) => {
			console.error(type, fieldsets, badProperties);
		});
		assert.fail(
			'Some types have properties that reference non-existent fieldsets',
		);
	}
};

module.exports = { validatePresentationalStructure };
