require('../relationship-picker/main.css');
require('./main.css');
const React = require('react');
const { render } = require('react-dom');
const { RelationshipPicker } = require('../relationship-picker');
const { SelectedRelationship } = require('./lib/selected-relationship');

module.exports = {
	withEditComponent: (container, entireRecord) =>
		render(
			<RelationshipPicker
				{...JSON.parse(container.dataset.props)}
				entireRecord={entireRecord}
				SelectedRelationship={SelectedRelationship}
				componentName="relationship"
			/>,
			container.parentNode,
		),
};
