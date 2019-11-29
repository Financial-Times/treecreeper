const type = require('./type');

module.exports = {
	// todo move to object rest parameters for options when upgrading node
	accessor(options = {}) {
		const types = this.rawData.getTypes();

		// Find root type names of rich relationships (newer designed)
		const rootRichRelationshipTypeNames = types
			.filter(({ from, to }) => from && to)
			.map(({ name }) => name);

		// Find relationships from type properties
		return types
			.filter(({ from, to }) => !from && !to)
			.reduce((relationships, { name, properties }) => {
				Object.entries(properties).forEach(
					([propName, { relationship, type: typeName }]) => {
						if (
							relationship ||
							rootRichRelationshipTypeNames.includes(typeName)
						) {
							relationships.push(
								this.getRelationshipType(
									name,
									propName,
									options,
								),
							);
						}
					},
				);
				return relationships;
			}, []);
	},
	// todo move to object rest parameters for options when upgrading node
	cacheKeyGenerator: (options = {}) => {
		return `relationship:${type.cacheKeyGenerator('all', options)}`;
	},
};
