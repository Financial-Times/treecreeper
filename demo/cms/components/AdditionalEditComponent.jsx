const React = require('react');

const AdditionalEditComponent = props => (
	<div className="additional-edit-component">
		This value: {props.value}, Some string: {props.entireRecord.someString}
	</div>
);

module.exports = AdditionalEditComponent;
