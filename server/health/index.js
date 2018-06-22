const constraintsCheck = require('./constraints.js');

module.exports = (req, res) => {
	const health = { constraints: [constraintsCheck] };

	if (!health) {
		return res.sendStatus(404).end();
	}

	const healthConstraints = health.constraints;
	const healthcheckStatus = healthConstraints.map(check => {
		return check.getStatus();
	});
	return res.json(healthcheckStatus);
};
