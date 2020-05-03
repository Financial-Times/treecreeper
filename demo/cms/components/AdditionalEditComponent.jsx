const React = require('react');

const AdditionalEditComponent = props => {
	return (
		<div className="additional-edit-component">
			This value: {props.entireRecord.code}
		</div>
	);
};

module.exports = AdditionalEditComponent;
