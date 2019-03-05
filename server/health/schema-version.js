const { checkSchemaConsistency } = require('../routes/graphql');

module.exports = () => {
	const isOk = checkSchemaConsistency();
	return {
		lastCheckOk: isOk,
		lastCheckTime: new Date().toUTCString(),
		lastCheckOutput: isOk
			? 'biz-ops-schema successfully updated for all API endpoints'
			: 'biz-ops-schema failed to update for graphQL endpoint',
		panicGuide:
			'Check splunk logs, running the following query to look for the underlying cause: index=heroku source=*biz-ops-api* event=GRAPHQL_SCHEMA_UPDATE_FAILED',
	};
};
