const Relationship = require('@financial-times/tc-ui/relationship/server');
const Boolean = require('./edit-boolean');
const DateTime = require('./edit-date-time');
const Dropdown = require('./edit-dropdown');
const Text = require('./edit-text');
const Number = require('./edit-number');
const TextArea = require('./edit-text-area');

module.exports = {
	Boolean,
	DateTime,
	Dropdown,
	Text,
	Number,
	TextArea,
	Relationship,
};
