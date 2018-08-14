module.exports = {
	readQuery: () => ({
		id: 'biz-ops-api-read-query',
		name: 'Biz-Ops API read Query',
		businessImpact:
			'Unable to retrieve data from Biz-Ops API. As a result, it will not be possible to read information from Biz-Ops API about our systems, contacts, teams or products',
		severity: 1,
		technicalSummary:
			'Runs a cypher read query to check that a successful response comes back from the Biz-Ops API'
	}),
	constraints: () => ({
		id: 'biz-ops-api-constraints',
		name: 'Biz Ops API constraints exist',
		businessImpact: 'Biz-Ops API may contain duplicated data',
		severity: 2,
		technicalSummary:
			'Makes an API call which checks that all the required constraints exist.',
		_dependencies: ['grapheneDB']
	}),
	apiCall: type => ({
		id: `biz-ops-api-${type}-call`,
		name: `Biz Ops API ${type} call`,
		businessImpact: `Unable to retrieve data from Biz-Ops API via ${type}. As a result, it will not be possible to read information about our systems, contacts, teams or products.`,
		severity: 1,
		technicalSummary: `Makes a call to the Biz-Ops API via ${type} and checks that the response code is equal to 200`,
		_dependencies: ['GrapheneDB']
	})
};
