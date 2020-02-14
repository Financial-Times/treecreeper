const sortBy = require('lodash.sortby');

module.exports = (itemSchema, itemValue) => {
	// preserves boolean values to prevent false being coerced to empty string
	if (itemSchema.type === 'Boolean') {
		return typeof itemValue === 'boolean' ? itemValue : '';
	}

	// return relationships as type, code and name object
	if (itemSchema.relationship) {
		if (itemSchema.hasMany) {
			return itemValue
				? sortBy(itemValue, `${itemSchema.type}.code`).map(item => ({
						code: item.code || item[itemSchema.type].code,
						name:
							item.name ||
							item.code ||
							item[itemSchema.type].name ||
							item[itemSchema.type].code,
						...item,
				  }))
				: [];
		}
		return itemValue
			? {
					code: itemValue.code || itemValue[itemSchema.type].code,
					name:
						itemValue.name ||
						itemValue.code ||
						itemValue[itemSchema.type].name ||
						itemValue[itemSchema.type].code,
					...itemValue,
			  }
			: null;
	}

	// everything else is just text
	return itemValue;
};
