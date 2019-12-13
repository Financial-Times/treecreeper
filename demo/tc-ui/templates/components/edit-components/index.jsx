const { primitives } = require('@financial-times/tc-ui/server');
const DateTime = require('./edit-date-time');
const Dropdown = require('./edit-dropdown');
const Text = require('./edit-text');
const Number = require('./edit-number');
const TextArea = require('./edit-text-area');

module.exports = {
	DateTime,
	Dropdown,
	Text,
	Number,
	TextArea,
	...primitives,
};
