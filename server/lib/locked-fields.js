const schema = require('@financial-times/biz-ops-schema');
const { LockedFieldsError } = require('./error-handling');

const getAllPropertyNames = nodeType => {
	return Object.entries(schema.getType(nodeType).properties).map(
		([propName]) => propName,
	);
};

const joinExistingAndNewLockedFields = (existingFields, newFields) => {
	const existingFieldNames = existingFields.map(({ fieldName }) => fieldName);
	const nonExistantLockedFields = newFields.filter(
		field => !existingFieldNames.includes(field.fieldName),
	);
	return [].concat(existingFields, nonExistantLockedFields);
};

const mergeLockedFields = (
	nodeType,
	clientId,
	lockFields,
	existingLockedFields,
) => {
	if (!clientId) {
		throw new LockedFieldsError(
			'clientId needs to be set to a valid system code in order to lock fields',
			lockFields,
			400,
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

	if (!existingLockedFields) {
		return JSON.stringify(fieldsToLock);
	}

	const allLockedFields = joinExistingAndNewLockedFields(
		existingLockedFields,
		fieldsToLock,
	);
	return JSON.stringify(allLockedFields);
};

const validateFields = (clientId, writeProperties, existingLockedFields) => {
	const lockedFieldsByAnotherClient = existingLockedFields.filter(
		field => field.clientId !== clientId,
	);
	const fieldsThatCannotBeUpdated = lockedFieldsByAnotherClient.filter(
		field => Object.keys(writeProperties).includes(field.fieldName),
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

module.exports = { mergeLockedFields, validateFields };
