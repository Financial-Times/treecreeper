const { logger } = require('../../api-core/lib/request-context');

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
	return res.status(err.status).json({ errors: [{ message: err.message }] });
};

module.exports = { errorToErrors };
