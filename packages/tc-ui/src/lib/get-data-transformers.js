const schema = require('@financial-times/tc-schema-sdk');

const getDataTransformers = assignComponent => {
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

				if (
					fieldProps.lockedBy &&
					!fieldProps.lockedBy.includes('biz-ops-admin')
				) {
					return;
				}
				const { parser } = assignComponent(fieldProps);

				const valueHasBeenReceived = fieldName in formData;
				// need to avoid treating missing data as an instruction to delete
				// relationships https://github.com/Financial-Times/biz-ops-admin/pull/280
				if (!valueHasBeenReceived) {
					return;
				}
				try {
					data[fieldName] = parser(formData[fieldName]);
				} catch (e) {
					console.log(e);
					throw e;
				}
			},
		);
		return data;
	};

	const formDataToGraphQL = (type, formData) => {
		const data = {};
		const typeProperties = schema.getType(type);
		Object.entries(typeProperties.properties).forEach(
			([fieldName, fieldProps]) => {
				const { parser } = assignComponent(fieldProps);
				if (
					formData[fieldName] &&
					formData[fieldName] !== "Don't know"
				) {
					data[fieldName] = parser(formData[fieldName]);
				}
			},
		);

		return data;
	};

	return {
		formDataToRest,
		formDataToGraphQL,
	};
};

module.exports = { getDataTransformers };
