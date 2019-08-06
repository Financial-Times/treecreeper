const _isEmpty = require('lodash.isempty');
const { logger } = require('../../../lib/request-context');

class LockedFieldsError extends Error {
	constructor(message, status) {
		super(message);
		this.status = status;
	}

	toString() {
		return `${this.constructor.name}: ${this.message}`;
	}
}

const getLockFieldList = (body = {}, fieldNames) => {
	if (!fieldNames) {
		return [];
	}
	return (fieldNames === 'all'
		? Object.keys(body)
		: fieldNames.split(',')
	).filter(name => name !== 'code');
};

const setLockedFields = (lockFields, existingLockedFields = {}, clientId) => {
	if (!lockFields.length) {
		return existingLockedFields;
	}
	if (!clientId) {
		throw new LockedFieldsError(
			'clientId needs to be set to a valid system code in order to lock fields',
			400,
		);
	}
	const fieldsThatCannotBeUpdated = {};

	lockFields.forEach(fieldName => {
		const lockedByExistingClientId = existingLockedFields[fieldName];
		if (lockedByExistingClientId && lockedByExistingClientId !== clientId) {
			fieldsThatCannotBeUpdated[fieldName] = lockedByExistingClientId;
		}
		existingLockedFields[fieldName] = clientId;
	});

	if (!_isEmpty(fieldsThatCannotBeUpdated)) {
		const erroredFields = Object.entries(fieldsThatCannotBeUpdated).map(
			([fieldName, lockedFieldClientId]) =>
				`${fieldName} is locked by ${lockedFieldClientId}`,
		);

		throw new LockedFieldsError(
			`The following fields cannot be locked because they are locked by another client: ${erroredFields.join(
				', ',
			)}`,
			400,
		);
	}
	logger.info({ event: 'SET_LOCKED_FIELDS', lockFields, clientId });
	return existingLockedFields;
};

const stringifyObject = obj =>
	Object.keys(obj).length ? JSON.stringify(obj) : null;

const removeLockedFields = (
	unlockFields = '',
	existingLockedFields = {},
	clientId,
) => {
	if (!existingLockedFields || unlockFields === 'all') {
		return {};
	}

	unlockFields.split(',').forEach(fieldName => {
		delete existingLockedFields[fieldName];
	});

	logger.info({ event: 'REMOVE_LOCKED_FIELDS', unlockFields, clientId });
	return existingLockedFields;
};

const validatePropertiesAgainstLocks = (body, clientId, newLockedFields) => {
	const clashes = Object.keys(body)
		.map(name => ({ name, locker: newLockedFields[name] }))
		.filter(({ locker }) => locker && locker !== clientId);

	if (clashes.length) {
		const erroredFields = Object.values(clashes).map(
			({ name, locker }) => `${name} is locked by ${locker}`,
		);

		throw new LockedFieldsError(
			`The following fields cannot be written because they are locked by another client: ${erroredFields.join(
				', ',
			)}`,
			400,
		);
	}
};

const mergeLockedFields = ({
	body,
	clientId,
	lockFields,
	unlockFields,
	existingLockedFields,
	validateInput = false,
}) => {
	const newLockedFields = setLockedFields(
		getLockFieldList(body, lockFields),
		removeLockedFields(unlockFields, existingLockedFields, clientId),
		clientId,
	);

	if (validateInput) {
		validatePropertiesAgainstLocks(body, clientId, newLockedFields);
	}

	return stringifyObject(newLockedFields);
};

module.exports = {
	mergeLockedFields,
	LockedFieldsError,
};
