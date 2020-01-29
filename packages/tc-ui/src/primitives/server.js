const sortBy = require('lodash.sortby');
const Text = require('./text/server');
const Boolean = require('./boolean/server');
const Enum = require('./enum/server');
const MultipleChoice = require('./multiple-choice/server');
const Number = require('./number/server');
const LargeText = require('./large-text/server');
const Relationship = require('./relationship/server');
const Temporal = require('./temporal/server');

const addDefaults = obj => ({
	hasValue: value => !!value,
	parser: value => (value === 'null' ? null : value),
	graphqlFragment: propName => propName,
	...obj,
});

const getValue = (itemSchema, itemValue) => {
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
			  }
			: null;
	}

	// everything else is just text
	return itemValue;
};

module.exports = {
	Text: addDefaults(Text),
	Boolean: addDefaults(Boolean),
	Enum: addDefaults(Enum),
	Number: addDefaults(Number),
	LargeText: addDefaults(LargeText),
	Temporal: addDefaults(Temporal),
	Relationship: addDefaults(Relationship),
	MultipleChoice: addDefaults(MultipleChoice),
	getValue,
};
