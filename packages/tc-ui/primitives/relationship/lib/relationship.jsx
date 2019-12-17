const { h } = require('preact');

const Relationship = ({ value, disabled, onRelationshipRemove, index }) => (
	<li
		data-name={value.name}
		data-code={value.code}
		className="selected-relationship"
	>
		<button
			type="button"
			disabled={disabled ? 'disabled' : null}
			className={`o-buttons o-buttons--small relationship-remove-button ${
				disabled ? 'disabled' : ''
			}`}
			onClick={onRelationshipRemove}
			data-index={index}
			key={index}
		>
			Remove
		</button>
		<span className="o-layout-typography">{value.name || value.code}</span>
	</li>
);

module.exports = { Relationship };
