const _isEmpty = require('lodash.isempty');
const { logger } = require('../../api-express/lib/request-context');

const normalizeFields = (fieldParam, body = {}) => {
	if (!fieldParam) {
		return [];
	}
	if (Array.isArray(fieldParam)) {
		return fieldParam;
	}
	if (fieldParam === 'all') {
		// TODO: exclude falsy field
		return Object.keys(body);
	}
	return fieldParam.split(',').map(field => field.trim());
};

const getLockFieldList = lockFields => {
	return lockFields.filter(name => name !== 'code');
};

const removeLockedFields = (clientId, unlockFields, existingLockedFields) => {
	const removedFields = Object.entries(existingLockedFields)
		.filter(([fieldName]) => !unlockFields.includes(fieldName))
		.reduce((newFields, [fieldName, value]) => {
			newFields[fieldName] = value;
			return newFields;
		}, {});

	logger.info({
		event: 'REMOVE_LOCKED_FIELDS',
		unlockFields,
		clientId,
	});
	return removedFields;
};

const setLockedFields = (clientId, lockFieldList, existingLockedFields) => {
	const conflictFields = normalizeFields(lockFieldList).reduce(
		(conflicts, fieldName) => {
			const lockedByExistingClientId = existingLockedFields[fieldName];
			if (
				lockedByExistingClientId &&
				lockedByExistingClientId !== clientId
			) {
				conflicts.push(
					`${fieldName} is locked by ${lockedByExistingClientId}`,
				);
			}
			existingLockedFields[fieldName] = clientId;
			return conflicts;
		},
		[],
	);

	if (conflictFields.length) {
		throw new Error(
			`The following fields cannot be locked because they are locked by another client: ${conflictFields.join(
				', ',
			)}`,
		);
	}
	logger.info({
		event: 'SET_LOCKED_FIELDS',
		lockFieldList,
		clientId,
	});
	return existingLockedFields;
};

const validatePropertiesAgainstLocked = (clientId, body, newLockedFields) => {
	const clashes = Object.keys(body).reduce((conflicts, fieldName) => {
		const locker = newLockedFields[fieldName];
		if (locker && locker !== clientId) {
			conflicts.push(`${fieldName} is locked by ${locker}`);
		}
		return conflicts;
	}, []);

	if (clashes.length) {
		throw new Error(
			`The following fields cannot be written because they are locked by another client: ${clashes.join(
				', ',
			)}`,
		);
	}
};

const mergeLockedFields = ({
	body = {},
	clientId,
	lockFields,
	unlockFields,
	existingLockedFields = {},
	needValidate = false,
}) => {
	const isUnlockAll = unlockFields === 'all';
	lockFields = normalizeFields(lockFields, body);
	unlockFields = normalizeFields(unlockFields);

	let lockFieldList = [];
	if (lockFields.length > 0) {
		if (!clientId) {
			throw new Error(
				'clientId needs to be set to a valid system code in order to lock fields',
			);
		}
		lockFieldList = getLockFieldList(lockFields);
	}
	let unchangedLockFields;
	if (isUnlockAll) {
		unchangedLockFields = {};
	} else {
		unchangedLockFields = !_isEmpty(existingLockedFields)
			? removeLockedFields(clientId, unlockFields, existingLockedFields)
			: {};
	}
	const newLockedFields = setLockedFields(
		clientId,
		lockFieldList,
		unchangedLockFields,
	);

	if (needValidate) {
		validatePropertiesAgainstLocked(clientId, body, newLockedFields);
	}

	return newLockedFields;
};

module.exports = {
	mergeLockedFields,
	normalizeFields,
	setLockedFields,
};
