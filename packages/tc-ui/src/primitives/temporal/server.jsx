const React = require('react');
const { format, parseISO } = require('date-fns');

const { WrappedEditComponent } = require('../../lib/components/input-wrapper');

const formatValue = (value, formatString) =>
	value ? format(parseISO(value), formatString) : null;

// TODO this probably errors - need to write comprehensive tests
// If date and time are given, time can be formatted but if not,
// time will be returned as it was inputted. This allows for manual time inputs
const formatTime = timeInput =>
	format(timeInput, 'h:mm:ss a') !== 'Invalid Date'
		? format(timeInput, 'h:mm:ss a')
		: timeInput;

const formatDateTime = (value, type) => {
	if (type === 'DateTime') {
		return formatValue(value, 'd MMMM yyyy, h:mm:ss a');
	}

	if (type === 'Date') {
		return formatValue(value, 'd MMMM yyyy');
	}

	if (type === 'Time') {
		const timeInput = value;
		return formatTime(timeInput);
	}
};

const convertValueForHTMLInput = (wrappedValue, type) => {
	if (!(wrappedValue && wrappedValue.formatted)) return null;
	const value = wrappedValue.formatted;
	if (type === 'Time') return value;
	const date = new Date(value).toISOString();
	/* This is a hack to remove Z in order to prepopulate a time-date field.
	Revisit this if a time needs to be added as field value.
	*/
	return type === 'DateTime' ? date.split('Z')[0] : date.split('T')[0];
};

const EditTemporal = ({ type, propertyName, value, required, disabled }) => {
	const inputType =
		type === 'DateTime' ? 'datetime-local' : type.toLowerCase();

	return (
		<span className="o-forms-input o-forms-input--text">
			<input
				name={`${propertyName}${disabled ? '-disabled' : ''}`}
				id={`id-${propertyName}`}
				type={`${inputType}`}
				value={convertValueForHTMLInput(value, type)}
				required={required ? 'required' : null}
				disabled={disabled ? 'disabled' : null}
			/>
		</span>
	);
};

module.exports = {
	name: 'Temporal',
	EditComponent: props => (
		<WrappedEditComponent
			Component={EditTemporal}
			componentType="temporal"
			{...props}
		/>
	),
	ViewComponent: ({ value, id, type }) => (
		<span id={id}>{formatDateTime(value.formatted, type)}</span>
	),
	hasValue: value => !!value.formatted,
	graphqlFragment: propName => `${propName} {formatted}`,
};
