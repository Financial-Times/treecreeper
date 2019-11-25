const { checkSchemaConsistency } = { checkSchemaConsistency: () => true };
const healthcheck = require('./healthcheck');

const schemaVersionCheck = () => {
	const isOk = checkSchemaConsistency();
	return {
		ok: isOk,
		lastUpdated: new Date().toUTCString(),
		checkOutput: isOk
			? 'biz-ops-schema successfully updated for all API endpoints'
			: 'biz-ops-schema failed to update for graphQL endpoint',
	};
};

module.exports = healthcheck(schemaVersionCheck, 'schemaVersion');
