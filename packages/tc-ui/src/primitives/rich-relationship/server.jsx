const React = require('react');
const { getType } = require('@financial-times/tc-schema-sdk');
const sortBy = require('lodash.sortby');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');
const { RelationshipPicker } = require('../relationship-picker');
const { SelectedRelationship } = require('./lib/selected-relationship');

const RelationshipPickerContainer = props => (
	<div>
		<RelationshipPicker
			{...props}
			SelectedRelationship={SelectedRelationship}
			componentName="rich-relationship-picker"
		/>
	</div>
);

const {
	ViewRelationship,
	setRelationshipAnnotator,
} = require('./lib/view-relationship');

module.exports = {
	name: 'RichRelationship',
	ViewComponent: ViewRelationship,
	EditComponent: props => (
		<WrappedEditComponent
			Component={RelationshipPickerContainer}
			componentType="relationship"
			{...props}
		/>
	),
	parser: (relValues, relProperties, assignComponent) => {
		if (!relValues) {
			return null;
		}
		relValues = JSON.parse(relValues);
		// TODO use hasValue
		if (!relValues) {
			return null;
		}
		const isArray = Array.isArray(relValues);
		const parsedRelValues = isArray
			? relValues.map(({ code }) => ({ code }))
			: { code: relValues.code };

		if (assignComponent && relProperties) {
			Object.entries(relProperties).forEach(([fieldName, fieldProps]) => {
				const { parser } = assignComponent(fieldProps);
				if (isArray) {
					relValues.forEach((value, index) =>
						Object.assign(parsedRelValues[index], {
							[fieldName]: value[fieldName]
								? parser(value[fieldName])
								: null,
						}),
					);
				} else {
					Object.assign(parsedRelValues, {
						[fieldName]: relValues[fieldName]
							? parser(relValues[fieldName])
							: null,
					});
				}
			});
		}
		return parsedRelValues;
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
			.forEach(([name, { type: fieldType }]) =>
				props.add(
					['DateTime', 'Date', 'Time'].includes(fieldType)
						? `${name} { formatted }`
						: name,
				),
			);
		const nodeProps = [...props].join(' ');
		const relationshipProps = [...new Set(Object.keys(properties))].join(
			' ',
		);
		return `${propName}_rel {${type} {${nodeProps}} ${relationshipProps}}`;
	},
	prepareValueForEdit: (value, propDef) => {
		if (propDef.hasMany) {
			return value
				? sortBy(value, `${propDef.type}.code`).map(item => ({
						code: item.code || item[propDef.type].code,
						name:
							item.name ||
							item.code ||
							item[propDef.type].name ||
							item[propDef.type].code,
						...item,
				  }))
				: [];
		}
		return value
			? {
					code: value.code || value[propDef.type].code,
					name:
						value.name ||
						value.code ||
						value[propDef.type].name ||
						value[propDef.type].code,
					...value,
			  }
			: null;
	},
};
