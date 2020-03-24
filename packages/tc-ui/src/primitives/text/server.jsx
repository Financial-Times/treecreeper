const React = require('react');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');

const localOnChange = (event, onChange) => {
	const { value, id, dataset } = event.currentTarget;
	const { parentCode } = dataset;
	const propertyName = id.split('-')[1];
	onChange(propertyName, parentCode, value);
};

const EditText = ({
	propertyName,
	value,
	required,
	lockedBy,
	disabled,
	isNested,
	parentCode,
	onChange,
}) => {
	const name = !isNested
		? `${propertyName}${lockedBy || disabled ? '-disabled' : ''}`
		: '';

	return (
		<span className="o-forms-input o-forms-input--text">
			<input
				name={name}
				id={`id-${propertyName}`}
				className="o-forms__text"
				type="text"
				defaultValue={value}
				required={required ? 'required' : null}
				disabled={disabled}
				data-parent-code={parentCode}
				onChange={
					!isNested ? null : event => localOnChange(event, onChange)
				}
			/>
		</span>
	);
};

module.exports = {
	name: 'Text',
	ViewComponent: ({ value, id }) => <span id={id}>{value}</span>,
	EditComponent: props => (
		<WrappedEditComponent
			Component={EditText}
			componentType="text"
			{...props}
		/>
	),
};
