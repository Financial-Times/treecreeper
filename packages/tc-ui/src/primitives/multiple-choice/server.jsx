const React = require('react');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');
const { OptionsInfo } = require('../enum/server');

const localOnChange = (event, currentValues, onChange) => {
	const { value, id, checked, dataset } = event.currentTarget;
	const selectedValues = new Set(currentValues);
	const { parentCode } = dataset;
	const propertyName = id.split('-')[1];
	// eslint-disable-next-line no-unused-expressions
	checked ? selectedValues.add(value) : selectedValues.delete(value);
	onChange(propertyName, parentCode, [...selectedValues].sort());
};

const Checkbox = ({
	propertyName,
	checkboxValue,
	disabled,
	checked,
	isNested,
	parentCode,
	onChange,
	currentValue,
}) => {
	const name = !isNested ? propertyName : '';
	return (
		<label>
			<input
				type="checkbox"
				name={name}
				value={checkboxValue}
				aria-label={checkboxValue}
				id={`checkbox-${propertyName}-${checkboxValue}`}
				defaultChecked={checked}
				disabled={disabled}
				data-parent-code={parentCode}
				onChange={
					isNested
						? event => localOnChange(event, currentValue, onChange)
						: null
				}
			/>

			<span className="o-forms-input__label" aria-hidden="true">
				{checkboxValue}
			</span>
		</label>
	);
};

const EditMultipleChoice = props => {
	const {
		propertyName,
		value,
		options,
		disabled,
		isNested,
		parentCode,
		onChange,
	} = props;
	const name = !isNested ? propertyName : '';
	return (
		<span className="o-forms-input o-forms-input--checkbox o-forms-input--inline">
			{options.map((option, index) => (
				<Checkbox
					propertyName={propertyName}
					checkboxValue={option}
					disabled={disabled}
					checked={value && value.includes(option)}
					key={index}
					isNested={isNested}
					parentCode={parentCode}
					onChange={onChange}
					currentValue={value}
				/>
			))}
			{/* We need to send a dummy value every time otherwise there will be no value
				in the form data when we uncheck them all, and it will therefore be impossible
				to unset the values */}
			<input type="hidden" value="treecreeper-fake-value" name={name} />
		</span>
	);
};

module.exports = {
	ViewComponent: ({ value, id }) => (
		<span id={id}>
			{value.map(val => (
				<span className="o-labels">{val}</span>
			))}
		</span>
	),
	parser: value => {
		if (!Array.isArray(value)) {
			value = [value];
		}
		return value.filter(v => v !== 'treecreeper-fake-value');
	},
	hasValue: value => value && value.length,
	EditComponent: props => (
		<WrappedEditComponent
			Component={EditMultipleChoice}
			componentType="enum"
			expandableContent={<OptionsInfo {...props} />}
			wrapperProps={{
				role: 'group',
				'aria-labelledby': 'inline-checkbox-group-title',
			}}
			{...props}
		/>
	),
};
