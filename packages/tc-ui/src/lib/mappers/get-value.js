const sortBy = require('lodash.sortby');

const getValue = (itemSchema, itemValue) => {
	// preserves boolean values to prevent false being coerced to empty string
	if (itemSchema.type === 'Boolean') {
		return typeof itemValue === 'boolean' ? itemValue : '';
	}

	// return relationships as type, code and name object
	if (itemSchema.relationship) {
		if (Object.keys(itemSchema.properties).length) {
			if (itemSchema.hasMany) {
				return itemValue
					? sortBy(
							itemValue,
							Object.keys(itemSchema.properties).length
								? `${itemSchema.type}.code`
								: 'code',
					  ).map(item => ({
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
		if (itemSchema.hasMany) {
			return itemValue ? itemValue.sort() : [];
		}
		return itemValue || null;
	}

	// everything else is just text
	return itemValue;
};

module.exports = { getValue };
