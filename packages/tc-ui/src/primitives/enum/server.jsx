const { getEnums } = require('@financial-times/tc-schema-sdk');
const React = require('react');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');
const { autolink } = require('../../lib/components/helpers');
const text = require('../text/server');

const Option = ({ option, selected }) => (
	<option
		value={option === `Don't know` ? 'null' : option}
		selected={option === selected ? true : null}
	>
		{option}
	</option>
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
					__html: autolink(enumWithMeta.description),
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
	ViewComponent: text.ViewComponent,
	EditComponent: props => (
		<WrappedEditComponent
			Component={EditEnum}
			componentType="enum"
			expandableContent={<OptionsInfo {...props} />}
			{...props}
		/>
	),
};
