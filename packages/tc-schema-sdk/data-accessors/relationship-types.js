const type = require('./type');

module.exports = {
	// todo move to object rest parameters for options when upgrading node
	accessor(options = {}) {
		return this.rawData.types.reduce((relationships, typeDefinition) => {
			const relationshipProperties = Object.entries(
				typeDefinition.properties,
			).filter(([, { relationship }]) => !!relationship);

			if (relationshipProperties.length) {
				relationships[type.name] = relationshipProperties.reduce(
					(obj, [propName]) => ({
						...obj,
						propName: this.getRelationshipType(
							typeDefinition.name,
							propName,
							options,
						),
					}),
					{},
				);
			}
			return relationships;
		}, {});
	},
	// todo move to object rest parameters for options when upgrading node
	cacheKeyGenerator: (options = {}) => {
		return `relationship:${type.cacheKeyGenerator('all', options)}`;
	},
};
