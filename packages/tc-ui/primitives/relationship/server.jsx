const { h } = require('preact');

const { FieldTitle } = require('../../lib/edit-helpers');

const { RelationshipPicker } = require('./lib/relationship-picker');
const { ViewRelationship } = require('./lib/view-relationship');

const EditRelationship = props => (
	// eslint-disable-next-line jsx-a11y/label-has-associated-control, jsx-a11y/label-has-for
	<label className="o-forms-field" data-biz-ops-type="relationship">
		<FieldTitle {...props} />
		<RelationshipPicker {...props} />
	</label>
);

module.exports = {
	ViewComponent: ViewRelationship,
	EditComponent: EditRelationship,
	parser: value => (value ? JSON.parse(value) : null),
	hasValue: (value, { hasMany }) =>
		hasMany ? value && value.length : !!value,
};
