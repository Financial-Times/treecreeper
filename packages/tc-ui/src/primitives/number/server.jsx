const text = require('../text/server');

const hasValue = value => value || value === 0;

module.exports = {
	name: 'Number',
	EditComponent: text.EditComponent,
	ViewComponent: text.ViewComponent,
	parser: value => {
		if (value === '') return null;
		return Number.isNaN(Number(value)) ? value : Number(value);
	},
	hasValue,
	prepareValueForEdit: value => (hasValue(value) ? value : ''),
};
