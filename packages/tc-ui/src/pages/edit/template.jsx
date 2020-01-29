const React = require('react');
const { sortBy } = require('lodash');
const { getEnums } = require('@financial-times/tc-schema-sdk');
const { FormError } = require('../../lib/components/messages');
const { Concept, SectionHeader } = require('../../lib/components/structure');

const { SaveButton, CancelButton } = require('../../lib/components/buttons');

const getValue = (itemSchema, itemValue) => {
	// preserves boolean values to prevent false being coerced to empty string
	if (itemSchema.type === 'Boolean') {
		return typeof itemValue === 'boolean' ? itemValue : '';
	}

	// return relationships as type, code and name object
	if (itemSchema.relationship) {
		if (itemSchema.hasMany) {
			return itemValue
				? sortBy(itemValue, `${itemSchema.type}.code`).map(item => ({
						code: item.code || item[itemSchema.type].code,
						name:
							item.name ||
							item.code ||
							item[itemSchema.type].name ||
							item[itemSchema.type].code,
				  }))
				: [];
		}
		return itemValue
			? {
					code: itemValue.code || itemValue[itemSchema.type].code,
					name:
						itemValue.name ||
						itemValue.code ||
						itemValue[itemSchema.type].name ||
						itemValue[itemSchema.type].code,
			  }
			: null;
	}

	// everything else is just text
	return itemValue;
};

const PropertyInputs = ({ fields, data, isEdit, type, assignComponent }) => {
	const propertyfields = Object.entries(fields);

	const fieldsToLock = data._lockedFields
		? JSON.parse(data._lockedFields)
		: {};

	const fieldNamesToLock = Object.keys(fieldsToLock).filter(
		fieldName => fieldsToLock[fieldName] !== 'biz-ops-admin',
	);

	return propertyfields
		.filter(
			([, schema]) =>
				// HACK: need to get rid of fields that are doing this
				!schema.label.includes('deprecated') &&
				!schema.deprecationReason,
		)
		.map(([name, item]) => {
			// console.log({item})
			let lockedBy;
			if (fieldNamesToLock.includes(name)) {
				lockedBy = fieldsToLock[name];
			}
			const { EditComponent } = assignComponent(item);
			const viewModel = {
				propertyName: name,
				value: getValue(item, data[name] || data[`${name}_rel`]),
				dataType: item.type,
				parentType: type,
				options: getEnums()[item.type]
					? Object.keys(getEnums()[item.type])
					: [],
				label: name.toUpperCase(),
				...item,
				isEdit,
				lockedBy,
			};

			return viewModel.propertyName && viewModel.label ? (
				<EditComponent {...viewModel} />
			) : null;
		});
};

const EditForm = props => {
	const {
		schema,
		data,
		isEdit,
		error,
		type,
		code,
		querystring,
		assignComponent,
	} = props;

	return (
		<>
			<div className="o-layout__sidebar" />
			<form
				className="o-layout__main o-forms"
				action={
					isEdit
						? `/${type}/${encodeURIComponent(code)}/edit`
						: `/${type}/create`
				}
				method="POST"
				autoComplete="off"
				data-tc-page-type={props.pageType}
			>
				<div className="o-layout__main__full-span">
					{/* note we use code || data.code so that, when creating and there is no
				code in the url path, we give a nicer error */}
					<FormError
						type={type}
						code={code || data.code}
						error={error}
					/>
					<div className="o-layout-typography">
						<h1 id="record-title" className="record-title">
							{type}: {data.name || data.code}
						</h1>
					</div>
					<Concept
						name={schema.name}
						description={schema.description}
						moreInformation={schema.moreInformation}
					/>
					<div className="biz-ops-cta-container--sticky o-layout__unstyled-element">
						<SaveButton
							querystring={querystring || ''}
							type={type}
							code={code}
						/>
						<CancelButton
							querystring={querystring || ''}
							type={type}
							code={code}
						/>
					</div>
					{Object.entries(schema.fieldsets).map(
						([name, { heading, properties }], index) => (
							<fieldset
								className={`fieldset-biz-ops fieldset-${name}`}
								key={index}
							>
								<div className="o-layout-typography">
									<SectionHeader title={heading} />
								</div>
								<PropertyInputs
									fields={properties}
									data={data}
									isEdit={isEdit}
									type={type}
									assignComponent={assignComponent}
								/>
							</fieldset>
						),
					)}
					<input
						name="_lockedFields"
						type="hidden"
						value={data._lockedFields}
					/>
				</div>
			</form>
			<script src="https://cloud.tinymce.com/stable/tinymce.js" defer />
		</>
	);
};

module.exports = EditForm;
