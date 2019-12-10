const { h } = require('preact');
const { FieldTitle } = require('./edit-helpers');
const { RelationshipPicker } = require('./lib/relationship-picker');

const EditRelationship = props => (
	// eslint-disable-next-line jsx-a11y/label-has-associated-control, jsx-a11y/label-has-for
	<label className="o-forms-field" data-biz-ops-type="relationship">
		<FieldTitle {...props} />
		<RelationshipPicker {...props} />
	</label>
);

module.exports = {
	Component: EditRelationship,
	parser: value => (value ? JSON.parse(value) : null),
	// getGraphQLEquivalent: (fieldName, formData, fieldProps) => {
	// 	const fieldValue = formData[fieldName];
	// 	const data = {};
	// 	if (fieldValue) {
	// 		const fieldLabels = formData[`name-${fieldName}`].split(',');
	// 		if (fieldProps.hasMany) {
	// 			data[fieldName] = fieldValue.split(',').map((code, index) => ({
	// 				code,
	// 				name: decodeURIComponent(fieldLabels[index]),
	// 			}));
	// 		} else {
	// 			data[fieldName] = {
	// 				code: fieldValue,
	// 				name: decodeURIComponent(fieldLabels[0]),
	// 			};
	// 		}
	// 	}
	// 	return data;
	// },
};
