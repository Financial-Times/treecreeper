const callApiGatewayCheck = require('./gatewayApiCall');
const callApiHerokuCheck = require('./herokuApiCall');
const constraintsCheck = require('./constraints');
const readQueryCheck = require('./readQuery');

module.exports = async (req, res) => {
	const healthchecks = [
		callApiGatewayCheck,
		callApiHerokuCheck,
		constraintsCheck,
		readQueryCheck
	].map(async check => {
		const checkObj = await check;
		return checkObj.getStatus();
	});

	const health = {
		schemaVersion: '1',
		name: 'Biz-Ops API',
		systemCode: 'biz-ops-api',
		description:
			'The Business Operations API. Stores infromation (systems/contacts/teams/products) in a graph datastore (Neo4j) and exposes this for queries.',
		checks: await Promise.all(healthchecks)
	};

	if (!health) {
		return res.sendStatus(404).end();
	}
	return res.json(health);
};
