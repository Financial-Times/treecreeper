const BIZ_OPS = 'biz-ops';

module.exports = {
	// Note that this accessor will return *all* relationship types
	// which includes user defined one and automatically generated using
	// root rich relationship types with having the same property definitions
	accessor({ primitiveTypes = BIZ_OPS, includeMetaFields = false } = {}) {
		const rawTypes = this.rawData.getTypes();
		const rawRelationshipTypes = this.rawData
			.getRelationshipTypes()
			.map(type => type.name);

		return rawTypes.reduce((relationships, { name, properties }) => {
			const relationshipTypes = Object.entries(properties)
				.filter(
					([, { relationship, type }]) =>
						relationship || rawRelationshipTypes.includes(type),
				)
				.filter(({ isTest }) => !isTest || this.includeTestDefinitions)
				.map(([propName]) =>
					this.getRelationshipType(name, propName, {
						primitiveTypes,
						includeMetaFields,
					}),
				);

			return [...relationships, ...relationshipTypes];
		}, []);
	},
	cacheKeyGenerator({
		primitiveTypes = BIZ_OPS,
		includeMetaFields = false,
	} = {}) {
		return `relationship:all:${primitiveTypes}:${includeMetaFields}`;
	},
};
