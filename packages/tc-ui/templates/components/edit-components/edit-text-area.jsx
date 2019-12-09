const { h } = require('preact');
const { FieldTitle } = require('./edit-helpers');
const { checkIfShouldDisable } = require('../../helpers');

const outputFreeText = (text = '') => text;

const EditTextArea = props => {
	const { propertyName, value, dataType, lockedBy } = props;
	const shouldDisable = checkIfShouldDisable(lockedBy);
	return (
		<div
			className={
				dataType === 'Document'
					? 'o-layout__main__full-span document-field'
					: ''
			}
		>
			<label className="o-forms-field" data-biz-ops-type="textarea">
				<FieldTitle {...props} />
				<span className="o-forms-input o-forms-input--textarea">
					<textarea
						name={propertyName}
						id={`id-${propertyName}`}
						rows={dataType === 'Document' ? '40' : '8'}
						disabled={shouldDisable ? 'disabled' : null}
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

module.exports = EditTextArea;
