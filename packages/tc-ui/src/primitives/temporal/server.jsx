const { h } = require('preact');
const { WrappedEditComponent } = require('../../components/edit-helpers');
const { formatDateTime } = require('../../components/helpers');

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
