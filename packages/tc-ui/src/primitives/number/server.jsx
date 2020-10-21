const text = require('../text/server');

module.exports = {
	name: 'Number',
	EditComponent: text.EditComponent,
	ViewComponent: text.ViewComponent,
	parser: value => {
		if (value === '') return null;
		return Number.isNaN(Number(value)) ? value : Number(value);
	},
	hasValue: value => value || value === 0,
	prepareValueForEdit: value => (value === null ? '' : value),
};
