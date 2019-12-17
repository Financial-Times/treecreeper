const { primitives } = require('@financial-times/tc-ui/server');
const Temporal = require('./edit-temporal');
const Dropdown = require('./edit-dropdown');
const LargeText = require('./edit-large-text');

module.exports = {
	Temporal,
	Dropdown,
	LargeText,
	...primitives,
};
