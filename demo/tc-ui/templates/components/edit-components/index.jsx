const { primitives } = require('@financial-times/tc-ui/server');
const Temporal = require('./edit-temporal');
const Dropdown = require('./edit-dropdown');

module.exports = {
	Temporal,
	Dropdown,
	...primitives,
};
