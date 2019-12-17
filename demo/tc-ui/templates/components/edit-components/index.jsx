const { primitives } = require('@financial-times/tc-ui/server');
const Temporal = require('./edit-temporal');
const Dropdown = require('./edit-dropdown');
const Text = require('./edit-text');
const Number = require('./edit-number');
const LargeText = require('./edit-large-text');

module.exports = {
	Temporal,
	Dropdown,
	Text,
	Number,
	LargeText,
	...primitives,
};
