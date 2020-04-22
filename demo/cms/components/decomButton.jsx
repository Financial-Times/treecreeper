const React = require('react');

const DecomButton = props => (
	<div className="decom-button">
		Stand-in decom component for example app
		{props.entireRecord.lifecycleStage}
	</div>
);

module.exports = DecomButton;
