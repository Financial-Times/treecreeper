const { h } = require('preact');
const { getType } = require('@financial-times/tc-schema-sdk');
const { FieldTitle } = require('../../lib/edit-helpers');

const { RelationshipPicker } = require('./lib/relationship-picker');
const {
	ViewRelationship,
	setRelationshipAnnotator,
} = require('./lib/view-relationship');

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
	setRelationshipAnnotator,
	graphqlFragment: (propName, { type }) => {
		const typeDef = getType(type);
		const props = new Set(['code']);
		if (typeDef.properties.name) {
			props.add('name');
		}

		props.add(
			...Object.entries(typeDef.properties)
				.filter(([, { useInSummary }]) => useInSummary)
				.map(([name]) => name),
		);

		return `${propName} {${[...props].join(' ')}}`;
	},
};
