const { logger, setContext } = require('../../lib/request-context');

const httpErrors = require('http-errors');

const success = (res, data) =>
	data.status ? res.status(data.status).json(data.data) : res.json(data);

const failure = (res, err) => {
	process.env.DEBUG && console.log(err);
	logger.error({ event: 'BIZ_OPS_API_ERROR', error: err });

	if (!err.status) {
		logger.error({ error: err });
		err = { status: 500, message: err.toString() };
	}
	res.status(err.status).json({ errors: [{ message: err.message }] });
};

const respond = (res, resultPromise) =>
	resultPromise.then(
		result => success(res, result),
		error => failure(res, error)
	);

const requestLog = (endpointName, method, req) => {
	setContext({ endpointName, method, params: req.params });
	logger.info(`[APP] ${endpointName} ${method}`);
};

const unimplemented = (endpointName, method, alternativeMethod) => (
	req,
	res
) => {
	requestLog(endpointName, method, req);
	return failure(
		res,
		httpErrors(405, `${method} is unimplemented. Use ${alternativeMethod}`)
	);
};

const controller = (endpointName, method, controller) => (req, res) => {
	requestLog(endpointName, method, req);
	respond(
		res,
		controller(
			Object.assign(
				{
					requestId: res.locals.requestId,
					clientId: res.locals.clientId,
					body: req.body,
					query: req.query
				},
				req.params
			)
		)
	);
};

module.exports = {
	unimplemented,
	controller
};
