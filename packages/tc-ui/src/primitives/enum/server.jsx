const { getEnums } = require('@financial-times/tc-schema-sdk');
const React = require('react');
const autolinker = require('autolinker');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');

const Option = ({ option, selected }) => (
	<option
		value={option === `Don't know` ? 'null' : option}
		selected={option === selected ? true : null}
	>
		{option}
	</option>
);

const OptionsInfo = ({ type, parentType }) => {
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
					<React.Fragment key={`${parentType}-${index}`}>
						<dt key={`${parentType}-${index}`}>{value}</dt>
						<dd key={`${parentType}-${index}`}>{description}</dd>
					</React.Fragment>
				))}
			</dl>
		</>
	);
};

const EditEnum = props => {
	const { propertyName, value, options, disabled } = props;
	const optionsWithDefault = ["Don't know"].concat(options);
	return (
		<span className="o-forms-input o-forms-input--select">
			<select
				disabled={disabled}
				id={`id-${propertyName}`}
				name={propertyName}
			>
				{optionsWithDefault.map((option, index) => (
					<Option
						option={option}
						selected={value || "Don't know"}
						key={index}
					/>
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
