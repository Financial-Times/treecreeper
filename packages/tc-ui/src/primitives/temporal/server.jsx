const React = require('react');
const parseISO = require('date-fns/parseISO');
const format = require('date-fns/format');

const { WrappedEditComponent } = require('../../lib/components/input-wrapper');

const formatValue = (value, formatString) =>
	value ? format(parseISO(value), formatString) : null;

const formatTemporal = (value, type) => {
	if (type === 'DateTime') {
		return formatValue(value, 'd MMMM yyyy, h:mm:ss a');
	}

	if (type === 'Date') {
		return formatValue(value, 'd MMMM yyyy');
	}

	if (type === 'Time') {
		return formatValue(`2020-01-15T${value}`, 'h:mm:ss a');
	}
};

const convertValueForHTMLInput = (wrappedValue, type) => {
	// this block is to handle the case where the form errors and we have
	// to accept and rerender the value (an ISO string) that was due to be sent
	// to the server
	if (typeof wrappedValue === 'string') {
		wrappedValue = {formatted: wrappedValue}
	}
 	if (!(wrappedValue && wrappedValue.formatted)) {
		return null
	};
	const value = wrappedValue.formatted;

	// HACK - we have never properly thought about what to do with timezones
	// as we have no usecases and don't know hat behaviour is right
	// For now we split on time zone designator and trim it off so that
	// the input doesn't error
	// Should probably store the timestamps without any timezone info for
	// consistency, but that's a bug to fix in future
	if (type === 'Time') return value.split(/Z|\+|-/)[0];
	const date = new Date(value).toISOString();
	return type === 'DateTime' ? date.split('Z')[0] : date.split('T')[0];
};

const localOnChange = (event, onChange) => {
	const { value, id, dataset } = event.currentTarget;
	const { parentCode } = dataset;
	const propertyName = id.split('-')[1];
	onChange(propertyName, parentCode, value);
};

const EditTemporal = ({
	type,
	propertyName,
	value,
	required,
	disabled,
	isNested,
	parentCode,
	onChange,
}) => {
	const name = !isNested
		? `${propertyName}${disabled ? '-disabled' : ''}`
		: '';

	return (
		<span className="o-forms-input o-forms-input--text">
			<input
				name={name}
				id={`id-${propertyName}`}
				type={
					type === 'DateTime' ? 'datetime-local' : type.toLowerCase()
				}
				step={type === 'Time' ? 1 : null}
				value={convertValueForHTMLInput(value, type)}
				required={required ? 'required' : null}
				disabled={disabled ? 'disabled' : null}
				data-parent-code={parentCode}
				onChange={
					!isNested ? null : event => localOnChange(event, onChange)
				}
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
		<span id={id}>{formatTemporal(value.formatted, type)}</span>
	),
	hasValue: value => !!value.formatted,
	graphqlFragment: propName => `${propName} {formatted}`,
};
