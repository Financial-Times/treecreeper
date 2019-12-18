const { getEnums } = require('@financial-times/tc-schema-sdk');
const { h, Fragment } = require('preact');
const { FieldTitle } = require('../../components/edit-helpers');
const { autolink } = require('../../components/helpers');
const text = require('../text/server');

const Option = ({ option, selected }) => (
	<option
		value={option === `Don't know` ? 'null' : option}
		selected={option === selected ? 'true' : null}
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

const EditEnum = props => {
	const { propertyName, value, options, lockedBy } = props;
	const optionsWithDefault = ["Don't know"].concat(options);
	const disabled = !!lockedBy;
	return (
		<label className="o-forms-field" data-biz-ops-type="enum">
			<FieldTitle
				{...props}
				expandableContent={<OptionsInfo {...props} />}
			/>
			<span className="o-forms-input o-forms-input--select">
				<select
					disabled={disabled}
					id={`id-${propertyName}`}
					name={propertyName}
				>
					{optionsWithDefault.map(option => (
						<Option
							option={option}
							selected={value || "Don't know"}
						/>
					))}
				</select>
			</span>
		</label>
	);
};

module.exports = {
	ViewComponent: text.ViewComponent,
	EditComponent: EditEnum,
};
