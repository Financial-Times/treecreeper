const text = require('../text/server');

module.exports = {
	EditComponent: text.EditComponent,
	ViewComponent: text.ViewComponent,
	parser: value => Number(value),
	hasValue: value => value || value === 0,
};
