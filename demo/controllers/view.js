const { view } = require('../tc-ui');

module.exports = async (req, res) => {
	try {
		const { status, body, headers } = await view({
			params: req.params,
			username: 'rhys.evans',
			query: req.query || {},
		});
		if (headers) {
			res.set(headers);
		}

		res.status(status).send(body);
	} catch (e) {
		res.send(500).end();
	}
};
