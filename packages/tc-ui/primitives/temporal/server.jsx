const { h } = require('preact');
const { FieldTitle } = require('../../lib/edit-helpers');
const { formatDateTime } = require('../../lib/helpers');

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

const EditTemporal = props => {
	const { type, propertyName, value, required, lockedBy } = props;

	const shouldDisable = !!lockedBy;

	const inputType =
		type === 'DateTime' ? 'datetime-local' : type.toLowerCase();

	return (
		<label className="o-forms-field" data-biz-ops-type="temporal">
			<FieldTitle {...props} />
			<span className="o-forms-input o-forms-input--text">
				<input
					name={`${propertyName}${shouldDisable ? '-disabled' : ''}`}
					id={`id-${propertyName}`}
					type={`${inputType}`}
					value={convertValueForHTMLInput(value, type)}
					required={required ? 'required' : null}
					disabled={shouldDisable ? 'disabled' : null}
				/>
			</span>
		</label>
	);
};

module.exports = {
	EditComponent: EditTemporal,
	ViewComponent: ({ value, id, type }) => (
		<span id={id}>{formatDateTime(value.formatted, type)}</span>
	),
	hasValue: value => !!value.formatted,
	graphqlFragment: propName => `${propName} {formatted}`,
};
