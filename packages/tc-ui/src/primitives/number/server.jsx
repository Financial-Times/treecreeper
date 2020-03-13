const text = require('../text/server');

module.exports = {
	name: 'Number',
	EditComponent: text.EditComponent,
	ViewComponent: text.ViewComponent,
	parser: value => (Number.isNaN(Number(value)) ? value : Number(value)),
	hasValue: value => value || value === 0,
};
