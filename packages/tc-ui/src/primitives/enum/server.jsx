const { getEnums } = require('@financial-times/tc-schema-sdk');
const React = require('react');
const autolinker = require('autolinker');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');

const localOnChange = (event, onChange) => {
	const { value, id, dataset } = event.currentTarget;
	const { parentCode } = dataset;
	const propertyName = id.split('-')[1];
	onChange(propertyName, parentCode, value);
};

const Option = ({ option }) => (
	<option value={option === `Don't know` ? 'null' : option}>{option}</option>
);

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
					__html:
						typeof window === 'undefined'
							? autolinker.link(enumWithMeta.description || '')
							: // eslint-disable-next-line no-undef
							  Autolinker.link(enumWithMeta.description || ''),
				}}
			/>
			<dl>
				{optionDefs.map(({ value, description }, index) => (
					<React.Fragment key={index}>
						<dt>{value}</dt>
						<dd>{description}</dd>
					</React.Fragment>
				))}
			</dl>
		</>
	);
};

const EditEnum = props => {
	const {
		propertyName,
		value,
		options,
		disabled,
		isNested,
		parentCode,
		onChange,
	} = props;
	const optionsWithDefault = ["Don't know"].concat(options);
	const name = !isNested ? propertyName : '';
	return (
		<span className="o-forms-input o-forms-input--select">
			<select
				disabled={disabled}
				id={`id-${propertyName}`}
				name={name}
				defaultValue={value || "Don't know"}
				data-parent-code={parentCode}
				onChange={
					!isNested ? null : event => localOnChange(event, onChange)
				}
			>
				{optionsWithDefault.map((option, index) => (
					<Option option={option} key={index} />
				))}
			</select>
		</span>
	);
};

module.exports = {
	name: 'Enum',
	ViewComponent: ({ value, id }) => (
		<span id={id} className="o-labels">
			{value}
		</span>
	),
	EditComponent: props => (
		<WrappedEditComponent
			Component={EditEnum}
			componentType="enum"
			expandableContent={<OptionsInfo {...props} />}
			{...props}
		/>
	),
	OptionsInfo,
};
