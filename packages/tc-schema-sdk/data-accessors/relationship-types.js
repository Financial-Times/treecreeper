const type = require('./type');

module.exports = {
	// todo move to object rest parameters for options when upgrading node
	accessor(options = {}) {
		const types = this.rawData.getTypes();
		const relationshipTypes = this.rawData.getRelationshipTypes();

		// Find relationships from type properties
		return types.reduce((relationships, { name, properties }) => {
			Object.entries(properties).forEach(
				([propName, { relationship, type: typeName }]) => {
					if (
						relationship ||
						relationshipTypes.find(
							relType => relType.name === typeName,
						)
					) {
						relationships.push(
							this.getRelationshipType(name, propName, options),
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
