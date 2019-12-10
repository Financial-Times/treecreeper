const { h, Fragment } = require('preact');
const { FieldTitle } = require('./edit-helpers');

const checkIfShouldDisable = (lockedBy, unique = false, isEdit = false) => {
	return (unique && isEdit) || !!lockedBy;
};

const RelationshipButton = ({ propertyName, item = [], shouldDisable }) => (
	<li
		id={`${propertyName}-${item.code}`}
		data-name={item.name}
		data-code={item.code}
		className="suggest"
	>
		<button
			type="button"
			id={`btn-${propertyName}-${item.code}`}
			disabled={shouldDisable ? 'disabled' : null}
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

const RelationshipPicker = props => {
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
			name={`${propertyName}`}
			id={`id-new-${propertyName}`}
			className="suggest"
			data-type={dataType}
			data-has-many={hasMany ? true : null}
			data-property-name={propertyName}
			data-parent-type={parentType}
			data-items={JSON.stringify(value)}
			type="text"
		>
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
							<InputComponent {...props} />
							<div className="o-forms-input__error">
								Use the mouse or arrow and enter keys to select
								from the suggestions
							</div>
						</span>
					</Fragment>
				)}
			</div>
		</div>
	);
};

const EditRelationship = props => (
	<label className="o-forms-field" data-biz-ops-type="relationship">
		<FieldTitle {...props} />
		<RelationshipPicker {...props} />
	</label>
);

module.exports = {
	RelationshipPicker,
	Component: EditRelationship,
	parser: value => (value ? value.split(',') : null),
	getFieldName: fieldName => `code-${fieldName}`,
	getGraphQLEquivalent: (fieldName, formData, fieldProps) => {
		const fieldValue = formData[`code-${fieldName}`];
		const data = {};
		if (fieldValue) {
			const fieldLabels = formData[`name-${fieldName}`].split(',');
			if (fieldProps.hasMany) {
				data[fieldName] = fieldValue.split(',').map((code, index) => ({
					code,
					name: decodeURIComponent(fieldLabels[index]),
				}));
			} else {
				data[fieldName] = {
					code: fieldValue,
					name: decodeURIComponent(fieldLabels[0]),
				};
			}
		}
		return data;
	},
};
