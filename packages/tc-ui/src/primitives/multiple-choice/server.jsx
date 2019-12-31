const { getEnums } = require('@financial-times/tc-schema-sdk');
const React = require('react');
const autolinker = require('autolinker');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');
const text = require('../text/server');

const OptionsInfo = ({ type }) => {
	const enumWithMeta = getEnums({ withMeta: true })[type];
	const optionDefs = Object.values(enumWithMeta.options);
	const hasOptionDescriptions = !!optionDefs[0].description;
	if (!hasOptionDescriptions) {
		return null;
	}
	return (
		<>
			<p
				dangerouslySetInnerHTML={{
					__html: autolinker.link(enumWithMeta.description || ''),
				}}
			/>
			<dl>
				{optionDefs.map(({ value, description }, index) => (
					<React.Fragment key={index}>
						<dt key={index}>{value}</dt>
						<dd key={index}>{description}</dd>
					</React.Fragment>
				))}
			</dl>
		</>
	);
};

const Checkbox = ({ name, checkboxValue, disabled, checked }) => {
	return (
		<label>
			<input
				type="checkbox"
				name={name}
				value={checkboxValue}
				aria-label={checkboxValue}
				id={`radio1-${name}`}
				checked={checked}
				disabled={disabled}
			/>

			<span className="o-forms-input__label" aria-hidden="true">
				{checkboxValue}
			</span>
		</label>
	);
};

const EditMultipleChoice = props => {
	const { propertyName, value, options, disabled } = props;
	return (
		<span className="o-forms-input o-forms-input--checkbox o-forms-input--inline">
			{options.map((option, index) => (
				<Checkbox
					name={propertyName}
					checkboxValue={option}
					disabled={disabled}
					checked={value && value.includes(option)}
					key={index}
				/>
			))}
		</span>
	);
};

module.exports = {
	ViewComponent: text.ViewComponent,
	EditComponent: props => (
		<WrappedEditComponent
			Component={EditMultipleChoice}
			componentType="enum"
			expandableContent={<OptionsInfo {...props} />}
			wrapperProps={{
				role: 'group',
				'aria-labelledby': 'inline-checkbox-group-title',
			}}
			{...props}
		/>
	),
};
