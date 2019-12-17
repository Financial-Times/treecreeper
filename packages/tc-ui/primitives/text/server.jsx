const { h } = require('preact');
const { FieldTitle } = require('../../lib/edit-helpers');

const EditText = props => {
	const { propertyName, value, required, lockedBy } = props;
	const disabled = !!lockedBy;
	return (
		<label className="o-forms-field" data-biz-ops-type="text">
			<FieldTitle {...props} />
			<span className="o-forms-input o-forms-input--text">
				<input
					name={`${propertyName}${
						lockedBy || disabled ? '-disabled' : ''
					}`}
					id={`id-${propertyName}`}
					className="o-forms__text"
					type="text"
					value={value || null}
					required={required ? 'required' : null}
					disabled={disabled ? 'disabled' : null}
				/>
			</span>
		</label>
	);
};

module.exports = {
	ViewComponent: ({ value, id }) => <span id={id}>{value}</span>,
	EditComponent: EditText,
};
