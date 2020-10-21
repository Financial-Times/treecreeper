const React = require('react');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');
const { markdownToHtml } = require('../../lib/markdown-to-html');

const outputFreeText = (text = '') => text;
const localOnChange = (event, onChange) => {
	const { value, id, dataset } = event.currentTarget;
	const { parentCode } = dataset;
	const propertyName = id.split('-')[1];
	onChange(propertyName, parentCode, value);
};

const EditLargeText = props => {
	const {
		propertyName,
		value,
		type,
		disabled,
		isNested,
		parentCode,
		onChange,
	} = props;
	const name = !isNested ? propertyName : '';

	return (
		<>
			<span className="o-forms-input o-forms-input--textarea">
				<textarea
					name={name}
					id={`id-${propertyName}`}
					rows={type === 'Document' ? '40' : '8'}
					disabled={disabled}
					defaultValue={outputFreeText(value)}
					data-parent-code={parentCode}
					onChange={
						!isNested
							? null
							: event => localOnChange(event, onChange)
					}
				/>
			</span>
			{type === 'Document' ? (
				<div className="document-edit-tools">
					Edit using github flavoured markdown or use the&nbsp;
					<button
						className="o-buttons o-buttons--secondary wysiwyg-toggle"
						type="button"
					>
						wysiwyg HTML editor
					</button>
				</div>
			) : null}
		</>
	);
};

module.exports = {
	name: 'LargeText',
	EditComponent: props => (
		<div
			className={
				props.type === 'Document'
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
			dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }}
		/>
	),
};
