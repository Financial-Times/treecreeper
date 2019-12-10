const { h } = require('preact');
const { FieldTitle } = require('./edit-helpers');
const { checkIfShouldDisable } = require('../../helpers');

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

const EditDateTime = props => {
	const {
		type,
		propertyName,
		value,
		required,
		unique,
		isEdit,
		lockedBy,
	} = props;

	const shouldDisable = checkIfShouldDisable(lockedBy, unique, isEdit);

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

module.exports = { Component: EditDateTime };
