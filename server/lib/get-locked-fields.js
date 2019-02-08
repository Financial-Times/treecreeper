const getLockedFields = (clientId, lockFields) => {
	if (!clientId) {
		throw new Error(
			`clientId needs to be set in order to lock \`${lockFields}\``,
		);
	}

	const fields = lockFields.split(',');
	const fieldsToLock = fields.map(fieldName => {
		return {
			fieldName,
			clientId,
		};
	});

	return JSON.stringify(fieldsToLock);
};

module.exports = getLockedFields;
