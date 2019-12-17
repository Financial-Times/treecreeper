const { h } = require('preact');
const { FieldTitle } = require('../../lib/edit-helpers');
const { markdown } = require('../../lib/helpers');

const outputFreeText = (text = '') => text;

const EditLargeText = props => {
	const { propertyName, value, dataType, lockedBy } = props;
	const disabled = !!lockedBy;
	return (
		<div
			className={
				dataType === 'Document'
					? 'o-layout__main__full-span document-field'
					: ''
			}
		>
			<label
				className="o-forms-field"
				data-type={dataType}
				data-biz-ops-type="textarea"
			>
				<FieldTitle {...props} />
				<span className="o-forms-input o-forms-input--textarea">
					<textarea
						name={propertyName}
						id={`id-${propertyName}`}
						rows={dataType === 'Document' ? '40' : '8'}
						disabled={disabled}
					>
						{outputFreeText(value)}
					</textarea>
				</span>
				{dataType === 'Document' ? (
					<div className="document-edit-tools">
						Edit using github flavoured markdown or use the&nbsp;
						<button
							className="o-buttons wysiwyg-toggle"
							type="button"
						>
							wysiwyg HTML editor
						</button>
					</div>
				) : null}
			</label>
		</div>
	);
};

module.exports = {
	EditComponent: EditLargeText,
	ViewComponent: ({ value, id }) => (
		<section
			id={id}
			dangerouslySetInnerHTML={{ __html: markdown(value) }}
		/>
	),
};
