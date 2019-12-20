const React = require('react');
const { getType } = require('@financial-times/tc-schema-sdk');
const { WrappedEditComponent } = require('../../components/edit-helpers');

const { RelationshipPicker } = require('./lib/relationship-picker');
const {
	ViewRelationship,
	setRelationshipAnnotator,
} = require('./lib/view-relationship');

module.exports = {
	ViewComponent: ViewRelationship,
	EditComponent: props => (
		<WrappedEditComponent
			Component={RelationshipPicker}
			componentType="relationship"
			{...props}
		/>
	),
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
