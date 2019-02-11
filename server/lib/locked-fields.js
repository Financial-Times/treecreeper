const schema = require('@financial-times/biz-ops-schema');
const { LockedFieldsError } = require('./error-handling');

const getAllPropertyNames = nodeType => {
	return Object.entries(schema.getType(nodeType).properties).map(
		([propName]) => propName,
	);
};

const getLockedFields = (nodeType, clientId, lockFields) => {
	if (!clientId) {
		throw new Error(
			`clientId needs to be set in order to lock \`${lockFields}\``,
		);
	}

	const fields =
		lockFields === 'all'
			? getAllPropertyNames(nodeType)
			: lockFields.split(',');
	const fieldsToLock = fields.map(fieldName => {
		return {
			fieldName,
			clientId,
		};
	});

	return JSON.stringify(fieldsToLock);
};

const validateFields = (lockedFields, clientId, body) => {
	const existingLockedFields = JSON.parse(lockedFields);
	const lockedFieldsByAnotherClient = existingLockedFields.filter(
		field => field.clientId !== clientId,
	);
	const fieldsThatCannotBeUpdated = lockedFieldsByAnotherClient.filter(
		field => Object.keys(body).includes(field.fieldName),
	);

	if (fieldsThatCannotBeUpdated.length) {
		const errorMessage =
			'The following fields cannot be updated because they are locked by another client: ';
		const erroredFields = fieldsThatCannotBeUpdated.map(
			field => `${field.fieldName} is locked by ${field.clientId}`,
		);

		throw new LockedFieldsError(
			errorMessage +
				erroredFields.join(', ').replace(/,(?!.*,)/g, ' and'),
			fieldsThatCannotBeUpdated,
			400,
		);
	}
};

module.exports = { getLockedFields, validateFields };
