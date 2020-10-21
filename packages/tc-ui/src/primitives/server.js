const Text = require('./text/server');
const Boolean = require('./boolean/server');
const Enum = require('./enum/server');
const MultipleChoice = require('./multiple-choice/server');
const Number = require('./number/server');
const LargeText = require('./large-text/server');
const Relationship = require('./relationship/server');
const RichRelationship = require('./rich-relationship/server');
const Temporal = require('./temporal/server');

const addDefaults = obj => ({
	hasValue: value => !!value,
	parser: value => (value === 'null' ? null : value),
	graphqlFragment: propName => propName,
	prepareValueForEdit: value => value || null,
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
	RichRelationship: addDefaults(RichRelationship),
	MultipleChoice: addDefaults(MultipleChoice),
};
