const React = require('react');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');

const getBooleanLabel = value => {
	if (value === true) return 'Yes';
	if (value === false) return 'No';
	return 'Unknown';
};

const Checkbox = ({
	propertyName,
	checkboxValue,
	disabled,
	userValue,
	isNested,
	parentCode,
	onChange,
}) => {
	const name = !isNested ? propertyName : `${parentCode}-${propertyName}`;
	const label = getBooleanLabel(checkboxValue);
	const handleChange = !isNested ? null : event => onChange(event);
	return (
		<label>
			<input
				type="radio"
				name={name}
				value={checkboxValue.toString()}
				aria-label={label}
				id={`radio-${propertyName}-${label}`}
				defaultChecked={userValue === checkboxValue ? 'true' : null}
				disabled={disabled}
				data-parent-code={parentCode}
				onChange={handleChange}
			/>

			<span className="o-forms-input__label" aria-hidden="true">
				{label}
			</span>
		</label>
	);
};

const EditBoolean = props => {
	const {
		propertyName,
		value,
		disabled,
		isNested,
		parentType,
		parentCode,
		onChange,
	} = props;
	return (
		<span className="o-forms-input o-forms-input--radio-round o-forms-input--inline">
			<Checkbox
				propertyName={propertyName}
				checkboxValue
				disabled={disabled}
				userValue={value}
				isNested={isNested}
				parentType={parentType}
				parentCode={parentCode}
				onChange={onChange}
			/>
			<Checkbox
				propertyName={propertyName}
				checkboxValue={false}
				disabled={disabled}
				userValue={value}
				isNested={isNested}
				parentType={parentType}
				parentCode={parentCode}
				onChange={onChange}
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
