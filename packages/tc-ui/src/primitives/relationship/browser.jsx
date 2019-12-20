require('./main.css');
const React = require('react');
const { render } = require('react-dom');
const { RelationshipPicker } = require('./lib/relationship-picker');

module.exports = {
	withEditComponent: container =>
		render(
			<RelationshipPicker {...JSON.parse(container.dataset.props)} />,
			document,
			container,
		),
};
