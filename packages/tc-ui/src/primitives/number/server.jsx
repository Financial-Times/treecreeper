const text = require('../text/server');

module.exports = {
	name: 'Number',
	EditComponent: text.EditComponent,
	ViewComponent: text.ViewComponent,
	// Note we don't use the modern Number.isNaN because that checks
	// for equality with NaN. We just want to check it's not a valid number
	parser: value => isNaN(value) ? value : Number(value),
	hasValue: value => value || value === 0,
};
