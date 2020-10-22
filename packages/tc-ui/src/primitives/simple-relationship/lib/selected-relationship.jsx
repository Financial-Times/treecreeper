const React = require('react');

const SelectedRelationship = ({
	value,
	disabled,
	onRelationshipRemove,
	index,
}) => (
	<li
		data-name={value.name}
		data-code={value.code}
		className="treecreeper-selected-relationship"
		key={index}
	>
		<span>
			<span className="o-layout-typography">
				{value.name || value.code}
			</span>

			<span>
				<button
					type="button"
					disabled={disabled ? 'disabled' : null}
					className={`o-buttons o-buttons--secondary o-buttons--small relationship-remove-button ${
						disabled ? 'disabled' : ''
					}`}
					onClick={onRelationshipRemove}
					data-index={`remove-${index}`}
				>
					Remove
				</button>
			</span>
		</span>
	</li>
);

module.exports = { SelectedRelationship };
