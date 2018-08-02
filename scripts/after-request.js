const { executeQuery } = require('../../server/db-connection');

const deleteDummyData = async (requestParams, response, context, ee, next) => {
	await executeQuery(
		`MATCH (N {_createdByClient: 'load-testing-client-id'}) detach delete N`
	);
	return next();
};

deleteDummyData();

module.exports = deleteDummyData;
