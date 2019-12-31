const React = require('react');

const Relationship = ({ value, disabled, onRelationshipRemove, index }) => (
	<li
		data-name={value.name}
		data-code={value.code}
		className="selected-relationship"
		key={index}
	>
		<button
			type="button"
			disabled={disabled ? 'disabled' : null}
			className={`o-buttons o-buttons--small relationship-remove-button ${
				disabled ? 'disabled' : ''
			}`}
			onClick={onRelationshipRemove}
			data-index={index}
		>
			Remove
		</button>
		<span className="o-layout-typography">{value.name || value.code}</span>
	</li>
);

module.exports = { Relationship };
