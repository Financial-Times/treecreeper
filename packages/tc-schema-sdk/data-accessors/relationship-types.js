const BIZ_OPS = 'biz-ops';

module.exports = {
	// Note that this accessor will return *all* relationship types
	// which includes user defined one and automatically generated using
	// root rich relationship types with having the same property definitions
	accessor({
		primitiveTypes = BIZ_OPS,
		includeMetaFields = false,
		excludeCypherRelationships = false,
	} = {}) {
		const types = this.getTypes({
			withRelationships: true,
		});

		return types.reduce((relationships, { name, properties }) => {
			let relationshipTypes = Object.entries(properties)
				.filter(([, { isRelationship }]) => !!isRelationship)
				.map(([propName]) =>
					this.getRelationshipType(name, propName, {
						primitiveTypes,
						includeMetaFields,
					}),
				);
			// If we're accessing for graphql generation.
			// We should exlcude cypher relationship
			if (excludeCypherRelationships) {
				relationshipTypes = relationshipTypes.filter(
					({ cypher }) => !cypher,
				);
			}

			return [...relationships, ...relationshipTypes];
		}, []);
	},
	cacheKeyGenerator({
		primitiveTypes = BIZ_OPS,
		includeMetaFields = false,
		excludeCypherRelationships = false,
	} = {}) {
		return `relationship:all:${primitiveTypes}:${includeMetaFields}:${excludeCypherRelationships}`;
	},
};
