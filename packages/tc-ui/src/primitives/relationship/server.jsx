const React = require('react');
const { getEnums } = require('@financial-times/tc-schema-sdk');
const { getType } = require('@financial-times/tc-schema-sdk');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');
const { RelationshipPicker } = require('./lib/relationship-picker');

const RelationshipPickerContainer = props => (
	<div>
		<RelationshipPicker {...props} />
	</div>
);

const {
	ViewRelationship,
	setRelationshipAnnotator,
} = require('./lib/view-relationship');

module.exports = {
	name: 'Relationship',
	ViewComponent: ViewRelationship,
	EditComponent: props => {
		const componentMappings = Object.keys(props.properties).length
			? Object.entries(props.properties).reduce(
					(obj, [propertyName, item]) => {
						const { assignComponent } = props;
						const { name: componentName } = assignComponent(item);
						obj[propertyName] = componentName;
						return obj;
					},
					{},
			  )
			: null;
		return (
			<WrappedEditComponent
				Component={RelationshipPickerContainer}
				componentMappings={componentMappings}
				componentType="relationship"
				{...props}
			/>
		);
	},
	parser: value => {
		if (!value) {
			return null;
		}
		value = JSON.parse(value);
		// TODO use hasValue
		if (!value) {
			return null;
		}
		return Array.isArray(value)
			? value.map(({ code }) => ({ code }))
			: { code: value.code };
	},
	hasValue: (value, { hasMany }) =>
		hasMany ? value && value.length : !!value,
	setRelationshipAnnotator,
	graphqlFragment: (propName, { type, properties }) => {
		const typeDef = getType(type);
		const props = new Set(['code']);
		if (typeDef.properties.name) {
			props.add('name');
		}
		if (typeDef.properties.isActive) {
			props.add('isActive');
		}

		Object.entries(typeDef.properties)
			.filter(([, { useInSummary }]) => useInSummary)
			.forEach(([name]) => props.add(name));
		const nodeProps = [...props].join(' ');
		const relationshipProps = [...new Set(Object.keys(properties))].join(
			' ',
		);

		return `${propName}_rel {${type} {${nodeProps}} ${relationshipProps}}`;
	},
};
