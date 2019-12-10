const { getEnums } = require('@financial-times/tc-schema-sdk');
const { h, Fragment } = require('preact');
const { FieldTitle } = require('./edit-helpers');
const { checkIfShouldDisable, autolink } = require('../../helpers');

const Option = ({ key, selected }) => {
	return (
		<option
			value={key === `Don't know` ? 'null' : key}
			selected={key === selected ? 'true' : null}
		>
			{key}
		</option>
	);
};

const OptionsInfo = ({ type }) => {
	const enumWithMeta = getEnums({ withMeta: true })[type];
	const optionDefs = Object.values(enumWithMeta.options);
	const hasOptionDescriptions = !!optionDefs[0].description;
	if (!hasOptionDescriptions) {
		return null;
	}
	return (
		<Fragment>
			<p
				dangerouslySetInnerHTML={{
					__html: autolink(enumWithMeta.description),
				}}
			/>
			<dl>
				{optionDefs.map(({ value, description }) => (
					<Fragment>
						<dt>{value}</dt>
						<dd>{description}</dd>
					</Fragment>
				))}
			</dl>
		</Fragment>
	);
};

const EditDropdown = props => {
	const { propertyName, value, options, lockedBy } = props;
	const optionsWithDefault = ["Don't know"].concat(options);
	const shouldDisable = checkIfShouldDisable(lockedBy);
	return (
		<label className="o-forms-field" data-biz-ops-type="enum">
			<FieldTitle
				{...props}
				expandableContent={<OptionsInfo {...props} />}
			/>
			<span className="o-forms-input o-forms-input--select">
				<select
					disabled={shouldDisable ? 'disabled' : ''}
					id={`id-${propertyName}`}
					name={propertyName}
				>
					{optionsWithDefault.map(option => {
						return (
							<Option
								key={option}
								selected={value || "Don't know"}
							/>
						);
					})}
				</select>
			</span>
		</label>
	);
};

module.exports = { Component: EditDropdown };
