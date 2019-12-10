const { h } = require('preact');
const { FieldTitle } = require('./edit-helpers');
const { checkIfShouldDisable } = require('../../helpers');

const EditBoolean = props => {
	const { propertyName, value, lockedBy } = props;
	const shouldDisable = checkIfShouldDisable(lockedBy);
	return (
		<div
			className="o-forms-field"
			data-biz-ops-type="boolean"
			role="group"
			aria-labelledby="inline-radio-round-group-title"
		>
			<FieldTitle {...props} />
			<span className="o-forms-input o-forms-input--radio-round o-forms-input--inline">
				<label>
					<input
						type="radio"
						name={propertyName}
						value="true"
						aria-label="Yes"
						id={`radio1-${propertyName}`}
						checked={value === true ? 'true' : null}
						disabled={shouldDisable ? 'disabled' : null}
					/>

					<span className="o-forms-input__label" aria-hidden="true">
						Yes
					</span>
				</label>

				<label>
					<input
						type="radio"
						name={propertyName}
						value="false"
						aria-label="No"
						id={`radio2-${propertyName}`}
						checked={value === false ? 'true' : null}
						disabled={shouldDisable ? 'disabled' : null}
					/>

					<span className="o-forms-input__label" aria-hidden="true">
						No
					</span>
				</label>
			</span>
		</div>
	);
};

module.exports = {
	Component: EditBoolean,
	parser: value => (value === undefined ? undefined : value === 'true'),
};
