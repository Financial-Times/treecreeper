require('./main.css');
const React = require('react');
const { render } = require('react-dom');
const { RelationshipPicker } = require('./lib/relationship-picker');

module.exports = {
	withEditComponent: (container, entireRecord) =>
		render(
			<RelationshipPicker {...JSON.parse(container.dataset.props)} entireRecord={entireRecord} />,
			container.parentNode,
		),
};
