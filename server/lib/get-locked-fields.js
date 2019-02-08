const schema = require('@financial-times/biz-ops-schema');

const getAllPropertyNames = nodeType => {
	return Object.entries(schema.getType(nodeType).properties).map(
		([propName]) => propName,
	);
};

const getLockedFields = (clientId, lockFields, nodeType) => {
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

module.exports = getLockedFields;
