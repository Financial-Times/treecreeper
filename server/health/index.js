const constraintsCheck = require('./constraints');
const queryCheck = require('./query');

module.exports = async (req, res) => {
	const healthCheckStatus = [constraintsCheck, queryCheck].map(check => {
		return check.getStatus();
	});
	const health = {
		schemaVersion: '1',
		name: 'Biz-Ops API',
		systemCode: 'biz-ops-api',
		description:
			'The Business Operations API. Stores infromation (systems/contacts/teams/products) in a graph datastore (Neo4j) and exposes this for queries.',
		checks: healthCheckStatus
	};

	if (!health) {
		return res.sendStatus(404).end();
	}
	return res.json(health);
};
