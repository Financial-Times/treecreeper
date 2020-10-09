require('../relationship-picker/main.css');
const React = require('react');
const { render } = require('react-dom');
const { RelationshipPicker } = require('../relationship-picker');
const { SelectedRelationship } = require('./lib/selected-relationship');

module.exports = {
	withEditComponent: container =>
		render(
			<RelationshipPicker
				{...JSON.parse(container.dataset.props)}
				SelectedRelationship={SelectedRelationship}
				componentName="relationship-picker"
			/>,
			container.parentNode,
		),
};
