const React = require('react');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');

const getBooleanLabel = value => {
	if (value === true) return 'Yes';
	if (value === false) return 'No';
	return 'Unknown';
};

const Checkbox = ({ name, checkboxValue, disabled, userValue }) => {
	const label = getBooleanLabel(checkboxValue);
	return (
		<label>
			<input
				type="radio"
				name={name}
				value={checkboxValue.toString()}
				aria-label={label}
				id={`radio-${name}-${label}`}
				defaultChecked={userValue === checkboxValue ? 'true' : null}
				disabled={disabled}
			/>

			<span className="o-forms-input__label" aria-hidden="true">
				{label}
			</span>
		</label>
	);
};

const EditBoolean = props => {
	const { propertyName, value, disabled } = props;
	return (
		<span className="o-forms-input o-forms-input--radio-round o-forms-input--inline">
			<Checkbox
				name={propertyName}
				checkboxValue
				disabled={disabled}
				userValue={value}
			/>
			<Checkbox
				name={propertyName}
				checkboxValue={false}
				disabled={disabled}
				userValue={value}
			/>
		</span>
	);
};

module.exports = {
	name: 'Boolean',
	ViewComponent: ({ value, id }) => (
		<span id={id}>{getBooleanLabel(value)}</span>
	),
	EditComponent: props => (
		<WrappedEditComponent
			Component={EditBoolean}
			componentType="boolean"
			wrapperTag="div"
			wrapperProps={{
				role: 'group',
				'aria-labelledby': 'inline-radio-round-group-title',
			}}
			{...props}
		/>
	),
	parser: value => (value === undefined ? undefined : value === 'true'),
	hasValue: value => typeof value === 'boolean',
};
