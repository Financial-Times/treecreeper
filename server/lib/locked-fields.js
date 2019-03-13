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

const getLockedFields = (nodeType, clientId, fieldnames) => {
	if (!clientId) {
		throw new LockedFieldsError(
			'clientId needs to be set to a valid system code in order to lock fields',
			fieldnames,
			400,
		);
	}

	return fieldnames === 'all'
		? getAllPropertyNames(nodeType)
		: fieldnames.split(',');
};

const mergeLockedFields = (
	nodeType,
	clientId,
	fieldnames,
	existingLockedFields,
) => {
	const fields = getLockedFields(nodeType, clientId, fieldnames);
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

const unlockFields = (nodeType, clientId, fieldnames, existingLockedFields) => {
	const fields = getLockedFields(nodeType, clientId, fieldnames);
	const lockedFields = JSON.parse(existingLockedFields);

	const fieldsToUnlock = fields.filter(fieldName => {
		return lockedFields[fieldName] === clientId;
	});

	fieldsToUnlock.forEach(fieldName => {
		delete lockedFields[fieldName];
	});

	return JSON.stringify(lockedFields);
};

module.exports = {
	mergeLockedFields,
	validateLockedFields,
	unlockFields,
	LockedFieldsError,
};
