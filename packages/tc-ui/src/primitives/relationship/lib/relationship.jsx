const React = require('react');
const { RichRelationships } = require('./rich-relationship');

const Relationship = props => {
	const {
		value,
		disabled,
		onRelationshipRemove,
		onRelationshipAnnotate,
		index,
	} = props;
	return (
		<>
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
				<span className="o-layout-typography">
					{value.name || value.code}
				</span>{' '}
				<button
					type="button"
					disabled={disabled ? 'disabled' : null}
					className={`o-buttons o-buttons--small relationship-annotate-button ${
						disabled ? 'disabled' : ''
					}`}
					onClick={onRelationshipAnnotate}
					data-index={index}
				>
					Annotate
				</button>
			</li>
			{/* <RichRelationships {...props} /> */}
		</>
	);
};
module.exports = { Relationship };
