const defaultTypes = {
	Code: {
		graphql: 'String',
		component: 'Text',
	},
	String: {
		graphql: 'String',
		component: 'Text',
	},
	Date: {
		graphql: 'Date',
		component: 'Temporal',
	},
	Time: {
		graphql: 'Time',
		component: 'Temporal',
	},
	DateTime: {
		graphql: 'DateTime',
		component: 'Temporal',
	},
	Int: {
		graphql: 'Int',
		component: 'Number',
	},
	Float: {
		graphql: 'Float',
		component: 'Number',
	},
	Boolean: {
		graphql: 'Boolean',
		component: 'Boolean',
	},
};

module.exports = {
	cacheKeyGenerator: ({ output = 'graphql' } = {}) => `primitives:${output}`,
	accessor({ output = 'graphql' } = {}) {
		let customTypes;
		try {
			customTypes = this.rawData.getPrimitiveTypes();
		} catch (e) {
			customTypes = {};
		}
		return Object.entries({ ...defaultTypes, ...customTypes }).reduce(
			(map, [type, def]) => ({ ...map, [type]: def[output] }),
			{},
		);
	},
};
