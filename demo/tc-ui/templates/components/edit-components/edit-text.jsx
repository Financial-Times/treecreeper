const { h } = require('preact');
const { FieldTitle } = require('./edit-helpers');
const { checkIfShouldDisable } = require('../../helpers');

const EditText = props => {
	const { propertyName, value, required, unique, isEdit, lockedBy } = props;
	const shouldDisable = checkIfShouldDisable(lockedBy, unique, isEdit);
	return (
		<label className="o-forms-field" data-biz-ops-type="text">
			<FieldTitle {...props} />
			<span className="o-forms-input o-forms-input--text">
				<input
					name={`${propertyName}${
						lockedBy || shouldDisable ? '-disabled' : ''
					}`}
					id={`id-${propertyName}`}
					className="o-forms__text"
					type="text"
					value={value || null}
					required={required ? 'required' : null}
					disabled={shouldDisable ? 'disabled' : null}
				/>
			</span>
		</label>
	);
};

module.exports = { Component: EditText };
