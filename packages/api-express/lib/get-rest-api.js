const express = require('express');
const { logger, setContext } = require('./request-context');
const {
	getHandler,
	deleteHandler,
	postHandler,
	patchHandler,
	absorbHandler,
} = require('../../../packages/api-rest-handlers');

const { errorToErrors } = require('../middleware/errors');

const requestLog = (endpointName, method, req) => {
	setContext({
		endpointName,
		method,
		params: req.params,
		query: req.query,
		bodyKeys: Object.keys(req.body || {}),
	});
	logger.info(`[APP] ${endpointName} ${method}`);
};

// const unimplemented = (endpointName, method, alternativeMethod) => req => {
// 	requestLog(endpointName, method, req);
// 	throw httpErrors(
// 		405,
// 		`${method} is unimplemented. Use ${alternativeMethod}`,
// 	);
// };

const controller = (method, handler) => (req, res, next) => {
	requestLog('rest', method, req);
	handler(
		Object.assign(
			{
				// TODO completely remove use of res.locals now we have getContext()
				metadata: {
					requestId: res.locals.requestId,
					// Defaults to null rather than undefined because, when writing to
					// neo4j, it avoids a 'missing parameter' error and it unsets any
					// previous values when updating.
					clientId: res.locals.clientId || null,
					clientUserId: res.locals.clientUserId || null,
				},
				body: req.body,
				query: req.query || {},
			},
			req.params,
		),
	)
		.then(result =>
			result.status
				? res.status(result.status).json(result.body)
				: res.json(result),
		)
		.catch(next);
};

const getRestApi = ({
	documentStore, // : s3Adaptor,
	// lockFieldsUsingMetadata, //: clientId,
	// updateStream, // : kinesisAdaptor
} = {}) => {
	const router = new express.Router();
	router
		.route('/:type/:code')
		.get(controller('GET', getHandler({ documentStore, logger })))
		.post(controller('POST', postHandler({ documentStore, logger })))
		// 	.put(unimplemented('PUT', 'PATCH'))
		.patch(controller('PATCH', patchHandler({ documentStore, logger })))
		.delete(controller('DELETE', deleteHandler({ documentStore, logger })));

	router.post(
		'/:type/:code/absorb/:codeToAbsorb',
		controller('ABSORB', absorbHandler({ documentStore, logger })),
	);

	router.use(errorToErrors);

	return router;
};

module.exports = {
	getRestApi,
};
