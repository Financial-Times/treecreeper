module.exports = {
	readQuery: {
		id: 'biz-ops-api-read-query',
		name: 'Biz-Ops API read Query',
		businessImpact:
			'Unable to retrieve data from Biz-Ops API. As a result, it will not be possible to read information from Biz-Ops API about our systems, contacts, teams or products',
		severity: 1,
		technicalSummary:
			'Runs a cypher read query to check that a successful response comes back from the Biz-Ops API',
		panicGuide:
			'Please check the logs in splunk using the following: `source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_FAILURE" healthCheckName="READ_QUERY',
	},
	constraints: {
		id: 'biz-ops-api-constraints',
		name: 'Biz Ops API constraints exist',
		businessImpact: 'Biz-Ops API may contain duplicated data',
		severity: 2,
		technicalSummary:
			'Makes an API call which checks that all the required constraints exist.',
		_dependencies: ['grapheneDB'],
	},
	apiCall: type => ({
		id: `biz-ops-api-${type}-call`,
		name: `Biz Ops API ${type} call`,
		businessImpact: `Unable to retrieve data from Biz-Ops API via ${type}. As a result, it will not be possible to read information about our systems, contacts, teams or products.`,
		severity: 1,
		technicalSummary: `Makes a call to the Biz-Ops API via ${type} and checks that the response code is equal to 200`,
		panicGuide:
			'Check the logs in splunk using the following: `source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_FAILURE" healthCheckName="API_CALL"`',
		_dependencies: ['GrapheneDB'],
	}),
	schemaVersion: {
		id: `biz-ops-api-schema-version`,
		name: `Biz Ops API schema version consistency`,
		businessImpact:
			'GraphQL api will be slightly out of step with rest API, meaning there may be disparities between what data can be retrieved by each endpoint',
		severity: 3,
		technicalSummary:
			'Surfaces the value of a boolean variable which is set to false if any attempt to update the schema from s3 fails',
		panicGuide:
			'Check splunk logs, running the following query to look for the underlying cause: index=heroku source=*biz-ops-api* event=GRAPHQL_SCHEMA_UPDATE_FAILED',
		_dependencies: [],
	},
};
