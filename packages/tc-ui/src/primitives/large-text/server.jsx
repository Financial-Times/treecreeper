const React = require('react');
const { WrappedEditComponent } = require('../../components/edit-helpers');
const { markdown } = require('../../components/helpers');

const outputFreeText = (text = '') => text;

const EditLargeText = props => {
	const { propertyName, value, dataType, disabled } = props;
	return (
		<>
			<span className="o-forms-input o-forms-input--textarea">
				<textarea
					name={propertyName}
					id={`id-${propertyName}`}
					rows={dataType === 'Document' ? '40' : '8'}
					disabled={disabled}
					defaultValue={outputFreeText(value)}
				/>
			</span>
			{dataType === 'Document' ? (
				<div className="document-edit-tools">
					Edit using github flavoured markdown or use the&nbsp;
					<button className="o-buttons wysiwyg-toggle" type="button">
						wysiwyg HTML editor
					</button>
				</div>
			) : null}
		</>
	);
};

module.exports = {
	EditComponent: props => (
		<div
			className={
				props.dataType === 'Document'
					? 'o-layout__main__full-span document-field'
					: ''
			}
		>
			<WrappedEditComponent
				Component={EditLargeText}
				componentType="large-text"
				{...props}
			/>
		</div>
	),
	ViewComponent: ({ value, id }) => (
		<section
			id={id}
			dangerouslySetInnerHTML={{ __html: markdown(value) }}
		/>
	),
};
