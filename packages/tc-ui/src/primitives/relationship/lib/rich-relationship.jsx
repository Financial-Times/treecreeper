const React = require('react');
const { getEnums } = require('@financial-times/tc-schema-sdk');
const {
	componentAssigner,
} = require('../../../lib/mappers/component-assigner');
const { getValue } = require('../../../lib/mappers/get-value.js');

class RichRelationships extends React.Component {
	constructor(props) {
		super(props);
		this.props = props;
	}

	render() {
		const { value, type, properties } = this.props;
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
					propertyName: name,
					value: getValue(item, value[name]),
					dataType: item.type,
					parentType: type,
					options: getEnums()[item.type]
						? Object.keys(getEnums()[item.type])
						: [],
					label: name.toUpperCase(),
					...item,
				};

				return viewModel.propertyName && viewModel.label ? (
					<span className="biz-ops-relationship-annotate" key={index}>
						<EditComponent key={index} {...viewModel} />
					</span>
				) : null;
			});
	}
}
module.exports = { RichRelationships };
