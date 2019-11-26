const type = require('./type');

module.exports = {
	// todo move to object rest parameters for options when upgrading node
	accessor(options = {}) {
		return this.rawData
			.getRelationships()
			.map(rel => this.getType(rel.name, options));
	},
	// todo move to object rest parameters for options when upgrading node
	cacheKeyGenerator: (options = {}) => {
		return `relationship:${type.cacheKeyGenerator('all', options)}`;
	},
};
