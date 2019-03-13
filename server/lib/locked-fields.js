const schema = require('@financial-times/biz-ops-schema');
const _isEmpty = require('lodash.isempty');

class LockedFieldsError extends Error {
	constructor(message, fields, status) {
		super(message);
		this.lockedFields = fields;
		this.status = status;
	}

	toString() {
		return `${this.constructor.name}: ${this.message}`;
	}
}

const getAllPropertyNames = nodeType => {
	return Object.entries(schema.getType(nodeType).properties).map(
		([propName]) => propName,
	);
};

const getLockedFields = (nodeType, clientId, fieldNames) => {
	if (!clientId) {
		throw new LockedFieldsError(
			'clientId needs to be set to a valid system code in order to lock fields',
			fieldNames,
			400,
		);
	}

	return fieldNames === 'all'
		? getAllPropertyNames(nodeType)
		: fieldNames.split(',');
};

const mergeLockedFields = (
	nodeType,
	clientId,
	lockFields,
	existingLockedFields,
) => {
	const fields = getLockedFields(nodeType, clientId, lockFields);
	const fieldsToLock = {};

	fields.forEach(field => {
		fieldsToLock[field] = clientId;
	});

	if (!existingLockedFields) {
		return JSON.stringify(fieldsToLock);
	}

	const allLockedFields = Object.assign(
		{},
		fieldsToLock,
		existingLockedFields,
	);

	return JSON.stringify(allLockedFields);
};

const validateLockedFields = (
	clientId,
	propertiesToModify,
	existingLockedFields,
) => {
	const fieldsThatCannotBeUpdated = {};

	Object.keys(propertiesToModify).forEach(property => {
		const lockedByExistingClientId = existingLockedFields[property];
		if (lockedByExistingClientId && lockedByExistingClientId !== clientId) {
			fieldsThatCannotBeUpdated[property] = lockedByExistingClientId;
		}
	});

	if (!_isEmpty(fieldsThatCannotBeUpdated)) {
		const errorMessage =
			'The following fields cannot be updated because they are locked by another client: ';
		const erroredFields = Object.entries(fieldsThatCannotBeUpdated).map(
			([fieldName, lockedFieldClientId]) =>
				`${fieldName} is locked by ${lockedFieldClientId}`,
		);

		throw new LockedFieldsError(
			errorMessage +
				erroredFields.join(', ').replace(/,(?!.*,)/g, ' and'),
			fieldsThatCannotBeUpdated,
			400,
		);
	}
};

const removeLockedFields = (
	nodeType,
	clientId,
	unlockFields,
	existingLockedFields,
) => {
	const fields = getLockedFields(nodeType, clientId, unlockFields);

	const fieldsToUnlock = fields.filter(fieldName => {
		return existingLockedFields[fieldName] === clientId;
	});

	fieldsToUnlock.forEach(fieldName => {
		delete existingLockedFields[fieldName];
	});

	return Object.keys(existingLockedFields).length
		? JSON.stringify(existingLockedFields)
		: null;
};

module.exports = {
	mergeLockedFields,
	validateLockedFields,
	removeLockedFields,
	LockedFieldsError,
};
