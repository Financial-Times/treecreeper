const { view } = require('../../packages/tc-ui');

module.exports = async (req, res) => {
	const { status, body, headers } = await view({
		params: req.params,
		username: 'rhys.evans',
		query: req.query || {},
	});
	res.set(headers);
	res.send(status, body);
};
