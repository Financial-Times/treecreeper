module.exports = (req, res, next) => {
	if (req.headers.api_key === process.env.API_KEY) {
		return next();
	}
	else {
		return res.status(400).end('Wrong API key');
	}
};
