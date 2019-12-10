const { h, Fragment, Component } = require('preact');

const checkIfShouldDisable = (lockedBy, unique = false, isEdit = false) => {
	return (unique && isEdit) || !!lockedBy;
};

const RelationshipRow = ({ propertyName, value, shouldDisable }) => (
	<li
		id={`${propertyName}-${value.code}`}
		data-name={value.name}
		data-code={value.code}
		className="suggest"
	>
		<button
			type="button"
			id={`btn-${propertyName}-${value.code}`}
			disabled={shouldDisable ? 'disabled' : null}
			className={`o-buttons o-buttons--small ${
				shouldDisable ? 'disabled' : ''
			}`}
		>
			Remove
		</button>
		<span className="o-layout-typography">{value.name}</span>
	</li>
);

const RelationshipRows = ({ hasMany, value, propertyName, shouldDisable }) => {
	if (!value) {
		return null;
	}

	value = hasMany ? value : [value];

	return value.map(val => (
		<RelationshipRow
			propertyName={propertyName}
			value={val}
			shouldDisable={shouldDisable}
		/>
	));
};

class RelationshipPicker extends Component {
	constructor(props) {
		super();
		this.props = props;
	}

	render() {
		const { props } = this;
		const {
			propertyName,
			hasMany,
			dataType,
			value,
			lockedBy,
			parentType,
		} = props;
		const shouldDisable = checkIfShouldDisable(lockedBy);
		return (
			<div
				data-component="relationship-picker"
				data-type={dataType}
				data-has-many={hasMany ? true : null}
				data-property-name={propertyName}
				data-parent-type={parentType}
				data-value={JSON.stringify(value)}
				data-disabled={shouldDisable}
			>
				<ul
					className="relationship-editor__list editable-relationships o-layout__unstyled-element"
					id={`ul-${propertyName}`}
				>
					<RelationshipRows
						{...props}
						shouldDisable={shouldDisable}
					/>
				</ul>
				<div className="o-layout-typography">
					{shouldDisable ? null : (
						<Fragment>
							<input
								name={`${propertyName}`}
								id={`id-new-${propertyName}`}
								className="suggest"
								data-type={dataType}
								data-has-many={hasMany ? true : null}
								data-property-name={propertyName}
								data-parent-type={parentType}
								type="text"
							/>
							<span className="o-forms-input o-forms-input--text">
								<div className="o-forms-input__error">
									Use the mouse or arrow and enter keys to
									select from the suggestions
								</div>
							</span>
						</Fragment>
					)}
				</div>
			</div>
		);
	}
}

module.exports = { RelationshipPicker };
