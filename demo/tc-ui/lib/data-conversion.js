const schema = require('@financial-times/tc-schema-sdk');
const { assignComponent } = require('./assign-component');

const defaultParser = value => (value === 'null' ? null : value);
const defaultGraphQlEquivalent = parser => (fieldName, data) => {
	if (data[fieldName] && data[fieldName] !== "Don't know") {
		return { fieldName: parser(data[fieldName]) };
	}
};
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
			const {
				parser = defaultParser,
				getFieldName = () => fieldName,
			} = assignComponent(fieldProps.type);

			const realFieldName = getFieldName(fieldName);
			const valueHasBeenReceived = realFieldName in formData;
			// need to avoid treating missing data as an instruction to delete
			// relationships https://github.com/Financial-Times/biz-ops-admin/pull/280
			if (!valueHasBeenReceived) {
				return;
			}
			data[fieldName] = parser(formData[realFieldName]);
		},
	);
	return data;
};

const formDataToGraphQL = async (type, formData) => {
	const data = {};
	const typeProperties = schema.getType(type);

	Object.entries(typeProperties.properties).forEach(
		([fieldName, fieldProps]) => {
			const componentBits = assignComponent(fieldProps.type);
			const { parser = defaultParser } = componentBits;

			const getGraphQLEquivalent =
				componentBits.getGraphQLEquivalent ||
				defaultGraphQlEquivalent(parser);

			const fields = getGraphQLEquivalent(
				fieldName,
				formData,
				fieldProps,
			);
			Object.assign(data, fields);
		},
	);

	return data;
};

module.exports = {
	formDataToRest,
	formDataToGraphQL,
};
