const React = require('react');
const text = require('../text/server');

const hasValue = value => value || value === 0;

module.exports = {
	name: 'Number',
	EditComponent: props => (
		<text.EditComponent
			{...props}
			value={hasValue(props.value) ? props.value : ''}
		/>
	),
	ViewComponent: text.ViewComponent,
	parser: value => {
		if (value === '') return null;
		return Number.isNaN(Number(value)) ? value : Number(value);
	},
	hasValue,
};
