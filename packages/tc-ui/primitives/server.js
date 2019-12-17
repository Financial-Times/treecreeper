const Text = require('./text/server');
const Boolean = require('./boolean/server');
const Enum = require('./enum/server');
const Number = require('./number/server');
const LargeText = require('./large-text/server');
const Relationship = require('./relationship/server');
const Temporal = require('./temporal/server');

const addDefaults = obj => ({
	hasValue: value => !!value,
	parser: value => (value === 'null' ? null : value),
	...obj,
});

module.exports = {
	Text: addDefaults(Text),
	Boolean: addDefaults(Boolean),
	Enum: addDefaults(Enum),
	Number: addDefaults(Number),
	LargeText: addDefaults(LargeText),
	Temporal: addDefaults(Temporal),
	Relationship: addDefaults(Relationship),
};
