const React = require('react');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');

const getBooleanLabel = value => {
	if (value === true) return 'Yes';
	if (value === false) return 'No';
	return 'Unknown';
};

const localOnChange = (event, onChange) => {
	const { value, id, dataset } = event.currentTarget;
	const { parentCode } = dataset;
	const propertyName = id.split('-')[1];
	onChange(propertyName, parentCode, value);
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
				onChange={
					!isNested ? null : event => localOnChange(event, onChange)
				}
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
		disabled,
		isNested,
		parentType,
		parentCode,
		onChange,
	} = props;
	const value = typeof props.value === 'boolean' ? props.value : '';
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
	parser: value => {
		// String(value) - on submission error the value we get is
		// is boolean because that is what neo4j returns (true !== 'true')
		return value === undefined ? undefined : String(value) === 'true';
	},
	hasValue: value => typeof value === 'boolean',
};
