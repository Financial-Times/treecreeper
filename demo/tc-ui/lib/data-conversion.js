const schema = require('@financial-times/tc-schema-sdk');
const { assignComponent } = require('./assign-component');

const defaultParser = value => (value === 'null' ? null : value);
const formDataToRest = (type, formData) => {
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
			const { parser = defaultParser } = assignComponent(fieldProps.type);

			const valueHasBeenReceived = fieldName in formData;
			// need to avoid treating missing data as an instruction to delete
			// relationships https://github.com/Financial-Times/biz-ops-admin/pull/280
			if (!valueHasBeenReceived) {
				return;
			}
			data[fieldName] = parser(formData[fieldName]);
		},
	);
	return data;
};

const formDataToGraphQL = async (type, formData) => {
	const data = {};
	const typeProperties = schema.getType(type);
	Object.entries(typeProperties.properties).forEach(
		([fieldName, fieldProps]) => {
			const { parser = defaultParser } = assignComponent(fieldProps.type);
			if (formData[fieldName] && formData[fieldName] !== "Don't know") {
				data.fieldName = parser(formData[fieldName]);
			}
		},
	);

	return data;
};

module.exports = {
	formDataToRest,
	formDataToGraphQL,
};
