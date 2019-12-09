const schema = require('@financial-times/tc-schema-sdk');

const parsers = {
	// ensure string value becomes boolean true/false; otherwise use undefined.
	Boolean: value => (value === undefined ? undefined : value === 'true'),
	Int: value => Number(value),
	Float: value => Number(value),
	default: value => (value === 'null' ? null : value),
};

const formDataToRest = (type, formData) => {
	console.log(formData);
	const data = {};
	const typeProperties = schema.getType(type);

	const lockedFields = formData._lockedFields
		? JSON.parse(formData._lockedFields)
		: {};

	Object.entries(typeProperties.properties).forEach(
		([fieldName, fieldProps]) => {
			if (fieldProps.deprecationReason) {
				return;
			}
			if (
				lockedFields[fieldName] &&
				lockedFields[fieldName] !== 'biz-ops-admin'
			) {
				return;
			}
			const fieldType = fieldProps.type;
			const isRelationship = !!fieldProps.relationship;
			const formDataName = `${isRelationship ? 'code-' : ''}${fieldName}`;
			const valueHasBeenReceived = formDataName in formData;
			// need to avoid treating missing data as an instruction to delete
			// relationships https://github.com/Financial-Times/biz-ops-admin/pull/280
			if (!valueHasBeenReceived) {
				return;
			}
			const fieldValue = formData[formDataName];
			if (isRelationship) {
				data[fieldName] = fieldValue ? fieldValue.split(',') : null;
			} else {
				data[fieldName] = (parsers[fieldType] || parsers.default)(
					fieldValue,
				);
			}
		},
	);
	return data;
};

const formDataToGraphQL = async (type, formData) => {
	const data = {};
	const typeProperties = schema.getType(type);

	Object.entries(typeProperties.properties).forEach(
		([fieldName, fieldProps]) => {
			const fieldType = fieldProps.type;
			const isRelationship = !!fieldProps.relationship;
			const fieldValue =
				formData[`${isRelationship ? 'code-' : ''}${fieldName}`];
			if (isRelationship && fieldValue) {
				const fieldLabels = formData[`name-${fieldName}`].split(',');
				if (fieldProps.hasMany) {
					data[fieldName] = fieldValue
						.split(',')
						.map((code, index) => ({
							code,
							name: decodeURIComponent(fieldLabels[index]),
						}));
				} else {
					data[fieldName] = {
						code: fieldValue,
						name: decodeURIComponent(fieldLabels[0]),
					};
				}
			} else if (fieldValue) {
				// Strip out "Don't know" from enum fields as it's not a writable value
				if (fieldType && fieldValue && fieldValue !== "Don't know") {
					data[fieldName] = parsers[fieldType]
						? parsers[fieldType](fieldValue)
						: fieldValue;
				}
			}
		},
	);

	return data;
};

module.exports = {
	formDataToRest,
	formDataToGraphQL,
};
