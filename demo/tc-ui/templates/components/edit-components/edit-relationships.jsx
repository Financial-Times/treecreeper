const { h, Fragment } = require('preact');
const { FieldTitle } = require('./edit-helpers');
const { checkIfShouldDisable } = require('../../helpers');

const RelationshipButton = ({ propertyName, item = [], shouldDisable }) => (
	<li
		id={`${propertyName}-${item.code}`}
		data-name={item.name}
		className="suggest"
	>
		<button
			type="button"
			id={`btn-${propertyName}-${item.code}`}
			disabled={shouldDisable ? 'disabled' : ''}
			className={`o-buttons o-buttons--small ${
				shouldDisable ? 'disabled' : ''
			}`}
		>
			Remove
		</button>
		<span className="o-layout-typography">{item.name}</span>
	</li>
);

const applyToRel = func => (hasMany, value, ...extras) => {
	if (!value) {
		return null;
	}

	return hasMany
		? value.map(val => func(val, ...extras))
		: func(value, ...extras);
};

const extractCode = applyToRel(({ code }) => code);
const extractEncodedName = applyToRel(({ name }) => encodeURIComponent(name));
const generateRelationshipButton = applyToRel(
	(item, propertyName, shouldDisable) =>
		RelationshipButton({ propertyName, item, shouldDisable }),
);

const EditRelationships = props => {
	const {
		propertyName,
		hasMany,
		label,
		dataType,
		value,
		lockedBy,
		parentType,
	} = props;
	const shouldDisable = checkIfShouldDisable(lockedBy);
	return (
		<label className="o-forms-field" data-biz-ops-type="relationship">
			<FieldTitle {...props} />

			<input
				id={`id-${propertyName}`}
				name={`code-${propertyName}`}
				type="hidden"
				value={extractCode(hasMany, value)}
			/>

			<input
				id={`name-${propertyName}`}
				name={`name-${propertyName}`}
				type="hidden"
				value={extractEncodedName(hasMany, value)}
			/>

			<ul
				className="relationship-editor__list editable-relationships o-layout__unstyled-element"
				id={`ul-${propertyName}`}
			>
				{generateRelationshipButton(
					hasMany,
					value,
					propertyName,
					shouldDisable,
				)}
			</ul>
			<div className="o-layout-typography">
				{shouldDisable ? null : (
					<Fragment>
						<span className="o-forms-input o-forms-input--text">
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
							<div className="o-forms-input__error">
								Use the mouse or arrow and enter keys to select
								from the suggestions
							</div>
						</span>
					</Fragment>
				)}
			</div>
		</label>
	);
};

module.exports = EditRelationships;
