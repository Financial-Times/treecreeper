const type = require('./type');
const primitiveTypesMap = require('../lib/primitive-types-map');
const metaProperties = require('../lib/meta-properties');

const BIZ_OPS = 'biz-ops';

const attachTypeProperties = ({
	primitiveTypes = BIZ_OPS, // graphql
	includeMetaFields = false,
}) => relationship => {
	const { properties = {} } = relationship;
	if (includeMetaFields) {
		metaProperties.forEach(metaProperty => {
			properties[metaProperty.name] = metaProperty;
		});
	}
	return {
		...relationship,
		properties: Object.entries(properties).reduce((prop, [name, def]) => {
			if (primitiveTypes === 'graphql') {
				// If not a primitive type we assume it's an enum and leave it unaltered
				def.type = primitiveTypesMap[def.type] || def.type;
			}
			if (def.pattern) {
				def.validator = this.getStringValidator(def.pattern);
			}
			prop[name] = def;
			return prop;
		}, {}),
	};
};

module.exports = {
	// todo move to object rest parameters for options when upgrading node
	accessor(options = {}) {
		return (this.rawData.getRelationships() || []).map(
			attachTypeProperties(options).bind(this),
		);
	},
	// todo move to object rest parameters for options when upgrading node
	cacheKeyGenerator: (options = {}) => {
		return `relationship:${type.cacheKeyGenerator('all', options)}`;
	},
};
