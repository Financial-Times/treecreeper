const React = require('react');
const { getEnums } = require('@financial-times/tc-schema-sdk');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');
const { OptionsInfo } = require('../enum/server');

const localOnChange = (event, currentValues, onChange) => {
	const { value, id, checked, dataset } = event.currentTarget;
	const selectedValues = new Set(currentValues);
	const { parentCode } = dataset;
	const propertyName = id.split('-')[1];
	// eslint-disable-next-line no-unused-expressions
	checked ? selectedValues.add(value) : selectedValues.delete(value);
	const values = selectedValues.size ? [...selectedValues].sort() : null;
	onChange(propertyName, parentCode, values);
};

const getDescription = (checkboxValue, type, parentCode) => {
	const enumWithMeta = getEnums({ withMeta: true })[type];
	const optionDefs = Object.values(enumWithMeta.options);
	const hasOptionDescriptions = !!optionDefs[0].description;
	if (!hasOptionDescriptions) {
		return null;
	}
	const [{ description }] = optionDefs.filter(
		({ value }) => value === checkboxValue,
	);
	return (
		<div
			className="tooltip-container"
			id={`tooltip-target-${parentCode}-${checkboxValue}`}
		>
			<span id={`tooltip-target-${parentCode}-${checkboxValue}`} />
			<i
				aria-label={`help for ${checkboxValue}`}
				className="o-icons-icon o-icons-icon--info treecreeper-help-icon"
			/>
			<div
				className="treecreeper-enum__tooltip"
				data-o-component="o-tooltip"
				data-o-tooltip-position="above"
				data-o-tooltip-target={`tooltip-target-${parentCode}-${checkboxValue}`}
				data-o-tooltip-append-to-body
				data-o-tooltip-show-on-hover="true"
			>
				<div className="o-tooltip-content">{description}</div>
			</div>
		</div>
	);
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
	type,
}) => {
	const name = !isNested ? propertyName : '';
	return (
		<label className={`checkbox-${propertyName}-${checkboxValue}`}>
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
			{getDescription(checkboxValue, type, parentCode, isNested)}
		</label>
	);
};

const EditMultipleChoice = props => {
	const {
		propertyName,
		value,
		disabled,
		isNested,
		parentCode,
		onChange,
		type,
	} = props;
	const name = !isNested ? propertyName : '';
	const options = Object.keys(getEnums()[type]);
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
					type={type}
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
	prepareValueForEdit: value => (value ? value.sort() : []),
};
