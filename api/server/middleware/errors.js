const { logger } = require('../lib/request-context');

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

const notFound = ({ path }, res) => {
	logger.info({ path, event: 'PATH_NOT_FOUND_ERROR' }, 'Not found');

	return res.status(404).json({
		errors: [
			{
				message: 'Not Found',
			},
		],
	});
};
const uncaughtError = (error, req, res, next) => {
	logger.error({ error, event: 'UNHANDLED_ERROR' }, 'Unhandled server error');
	next(error);
};

module.exports = { errorToErrors, notFound, uncaughtError };
