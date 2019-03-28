const schema = require('@financial-times/biz-ops-schema');
const _isEmpty = require('lodash.isempty');
const { logger } = require('./request-context');

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

const getLockedFields = (nodeType, fieldNames) =>
	fieldNames === 'all'
		? getAllPropertyNames(nodeType)
		: fieldNames.split(',');

const setLockedFields = (clientId, lockFields, existingLockedFields) => {
	if (!clientId) {
		throw new LockedFieldsError(
			'clientId needs to be set to a valid system code in order to lock fields',
			lockFields,
			400,
		);
	}

	const fieldsToLock = {};

	lockFields.forEach(field => {
		fieldsToLock[field] = clientId;
	});

	logger.info({ event: 'SET_LOCKED_FIELDS', lockFields, clientId });

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

const removeLockedFields = (unlockFields, existingLockedFields, clientId) => {
	if (!existingLockedFields) {
		return;
	}

	unlockFields.forEach(fieldName => {
		delete existingLockedFields[fieldName];
	});

	logger.info({ event: 'REMOVE_LOCKED_FIELDS', unlockFields, clientId });

	return Object.keys(existingLockedFields).length
		? JSON.stringify(existingLockedFields)
		: null;
};

const mergeLockedFields = (nodeType, clientId, query, existingLockedFields) => {
	const { lockFields, unlockFields } = query;

	if (lockFields) {
		const fields = getLockedFields(nodeType, lockFields);
		return setLockedFields(clientId, fields, existingLockedFields);
	}

	if (unlockFields) {
		const fields = getLockedFields(nodeType, unlockFields);
		return removeLockedFields(fields, existingLockedFields, clientId);
	}

	return null;
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

module.exports = {
	mergeLockedFields,
	validateLockedFields,
	LockedFieldsError,
};
