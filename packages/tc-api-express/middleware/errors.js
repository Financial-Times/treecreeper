const { logger } = require('@financial-times/tc-api-express-logger');

// eslint-disable-next-line no-unused-vars
const errorToErrors = (err, req, res, next) => {

	if (!err.status) {
		logger.error({ event: 'UNCAUGHT_ERROR', ...err });
		err = { status: 500, message: err.toString() };
	} else {
		logger.error({ event: 'USER_ERROR', ...err });
	}

	if (req.method === 'HEAD') {
		const message = err.message.replace(/\n/g, ' ');
		res.set('Debug-Error', message);
		return res.status(err.status).end();
	}
	return res.status(err.status).json({ errors: [{ message: err.message }] });
};

module.exports = { errorToErrors };
