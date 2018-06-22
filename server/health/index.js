const constraintsCheck = require('./constraints.js');

module.exports = (req, res) => {
	const health = {
		name: 'Biz-Ops API (v1)',
		description:
			'Checks to make sure that the correct constraints exist in the database',
		checks: [{ constraints: constraintsCheck }]
	};

	if (!health) {
		return res.sendStatus(404).end();
	}

	const healthchecks = health.checks;
	const healthcheckStatus = healthchecks.map(check => {
		return check.constraints.getStatus();
	});
	return res.json(healthcheckStatus);
};
