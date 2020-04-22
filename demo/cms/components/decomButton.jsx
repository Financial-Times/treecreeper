const React = require('react');

const DecomButton = props => (
	<div className="decommission-override">
		Stand-in decom component for example app
		{props.entireRecord.lifecycleStage}
	</div>
);

module.exports = DecomButton;
