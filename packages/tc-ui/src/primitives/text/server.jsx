const React = require('react');
const { WrappedEditComponent } = require('../../components/edit-helpers');

const EditText = ({ propertyName, value, required, lockedBy, disabled }) => (
	<span className="o-forms-input o-forms-input--text">
		<input
			name={`${propertyName}${lockedBy || disabled ? '-disabled' : ''}`}
			id={`id-${propertyName}`}
			className="o-forms__text"
			type="text"
			value={value || null}
			required={required ? 'required' : null}
			disabled={disabled}
		/>
	</span>
);

module.exports = {
	ViewComponent: ({ value, id }) => <span id={id}>{value}</span>,
	EditComponent: props => (
		<WrappedEditComponent
			Component={EditText}
			componentType="text"
			{...props}
		/>
	),
};
