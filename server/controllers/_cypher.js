const db = require('../db-connection');

const isWriteQuery = (query) => {
	// TODO refine this
	// call is in technicallead
	const writeClauses = ['create','detach','delete','set','remove','foreach', /*'call'*/];

	for (let writeClause of writeClauses) {
		if (query.toLowerCase().includes(writeClause)) {
			return true;
		}
	}
	return false;
};

module.exports = async (res, query) => {

	console.log('[_CYPHER] query', query);

	if (isWriteQuery(query)) {
		const error = 'Only read queries allowed';
		console.log('[CYPHER] error', error);
		return res.stauts(404).end(error);
	}

	const result = await db.run(query);

	console.log('SENDING');
	res.send(result);
};
