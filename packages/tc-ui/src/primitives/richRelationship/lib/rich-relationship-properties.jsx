/* global window */
const React = require('react');
const { getEnums } = require('@financial-times/tc-schema-sdk');
const {
	componentAssigner,
} = require('../../../lib/mappers/component-assigner');
const { getValue } = require('../../../lib/mappers/get-value');

class RelationshipProperties extends React.Component {
	constructor(props) {
		super();
		this.props = props;
	}

	componentDidMount() {
		if (window && window.Origami) {
			// needed to init tooltip used for Annotate button
			window.Origami['o-tooltip'].init();
			window.Origami['o-expander'].init();
		}
	}

	render() {
		const { value, type, properties, onChange } = this.props;
		const propertyfields = Object.entries(properties);

		return propertyfields
			.filter(([, { deprecationReason }]) => !deprecationReason)
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
	}
}
module.exports = { RelationshipProperties };
