const React = require('react');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');

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
	const handleChange = !isNested ? null : event => onChange(event);

	return (
		<span className="o-forms-input o-forms-input--text">
			<input
				name={name}
				id={`id-${propertyName}`}
				className="o-forms__text"
				type="text"
				defaultValue={value || null}
				required={required ? 'required' : null}
				disabled={disabled}
				data-parent-code={parentCode}
				onChange={handleChange}
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
