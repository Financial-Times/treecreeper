const callApiGatewayCheck = require('./gateway-api-call');
const callApiHerokuCheck = require('./heroku-api-call');
const constraintsCheck = require('./constraints');
const readQueryCheck = require('./read-query');
const schemaVersionCheck = require('./schema-version');

module.exports = async (req, res) => {
	const healthchecks = [
		callApiGatewayCheck,
		callApiHerokuCheck,
		constraintsCheck,
		readQueryCheck,
		schemaVersionCheck,
	].map(async check => {
		const checkObj = await check;
		return checkObj.getStatus();
	});

	const health = {
		schemaVersion: 1,
		name: 'Biz-Ops API',
		systemCode: 'biz-ops-api',
		description:
			'The Business Operations API. Stores infromation (systems/contacts/teams/products) in a graph datastore (Neo4j) and exposes this for queries.',
		checks: await Promise.all(healthchecks),
	};

	if (!health) {
		return res.sendStatus(404).end();
	}
	return res.json(health);
};
