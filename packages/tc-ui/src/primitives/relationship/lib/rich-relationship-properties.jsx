const React = require('react');
const { getEnums } = require('@financial-times/tc-schema-sdk');
const {
	componentAssigner,
} = require('../../../lib/mappers/component-assigner');
const { getValue } = require('../../../lib/mappers/get-value.js');

const RelationshipProperties = props => {
	const { value, type, properties, onChange } = props;
	const propertyfields = Object.entries(properties);

	return propertyfields
		.filter(
			([, schema]) =>
				// HACK: need to get rid of fields that are doing this
				!schema.label.includes('deprecated') &&
				!schema.deprecationReason,
		)
		.map(([name, item], index) => {
			const assignComponent = componentAssigner();
			const { EditComponent } = assignComponent(item);

			const viewModel = {
				isNested: true,
				parentCode: value.code,
				propertyName: name,
				value: getValue(item, value[name]),
				onChange,
				dataType: item.type,
				parentType: type,
				options: getEnums()[item.type]
					? Object.keys(getEnums()[item.type])
					: [],
				label: name.toUpperCase(),
				...item,
			};

			return viewModel.propertyName && viewModel.label ? (
				<EditComponent key={index} {...viewModel} />
			) : null;
		});
};
module.exports = { RelationshipProperties };
