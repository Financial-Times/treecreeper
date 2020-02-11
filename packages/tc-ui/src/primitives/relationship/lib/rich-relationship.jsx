const React = require('react');
const { getEnums } = require('@financial-times/tc-schema-sdk');

const RichRelationships = props => {
	const { value, type, properties, assignComponent } = props;

	const propertyfields = Object.entries(properties);

	return value
		? propertyfields
				.filter(
					([, schema]) =>
						// HACK: need to get rid of fields that are doing this
						!schema.label.includes('deprecated') &&
						!schema.deprecationReason,
				)
				.map(([name, item], i) => {
					const { EditComponent } = assignComponent(item);

					const itemValue = Array.isArray(value)
						? value[i][name]
						: value[name];

					const viewModel = {
						propertyName: name,
						value: itemValue,
						dataType: item.type,
						parentType: type,
						options: getEnums()[item.type]
							? Object.keys(getEnums()[item.type])
							: [],
						label: name.toUpperCase(),
						...item,
					};

					return viewModel.propertyName && viewModel.label ? (
						<li>
							<EditComponent {...viewModel} />
						</li>
					) : null;
				})
		: null;
};

module.exports = { RichRelationships };
