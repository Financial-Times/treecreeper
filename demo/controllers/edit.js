const { edit } = require('../tc-ui');

module.exports = async (req, res) => {
	try {
		const { status, body, headers } = await edit({
			params: req.params,
			username: 'rhys.evans',
			query: req.query || {},
			method: req.method,
			body: req.body,
		});
		if (headers) {
			res.set(headers);
		}

		res.status(status).send(body);
	} catch (e) {
		res.send(500).end();
	}
};
