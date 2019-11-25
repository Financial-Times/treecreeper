const { logger } = require('@financial-times/tc-api-express-logger');

// eslint-disable-next-line no-unused-vars
const errorToErrors = (err, req, res, next) => {
	if (process.env.DEBUG) {
		console.log(err); // eslint-disable-line no-console
	}
	logger.error({ event: 'BIZ_OPS_API_ERROR', error: err });

	if (!err.status) {
		logger.error({ error: err });
		err = { status: 500, message: err.toString() };
	}
	if (req.method === 'HEAD') {
		const message = err.message.replace(/\n/g, ' ');
		res.set('Debug-Error', message);
		return res.status(err.status).end();
	}
	return res.status(err.status).json({ errors: [{ message: err.message }] });
};

module.exports = { errorToErrors };
