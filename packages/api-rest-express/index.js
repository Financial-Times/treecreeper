const express = require('express');
const bodyParser = require('body-parser');
const httpErrors = require('http-errors');

const clientId = require('../../packages/api-core/lib/middleware/client-id');
const requestId = require('../../packages/api-core/lib/middleware/request-id');
const {
	logger,
	setContext,
	middleware: contextMiddleware,
} = require('../../packages/api-core/lib/request-context');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
];

const {
	errorToErrors,
} = require('../../packages/api-core/lib/middleware/errors');

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

const unimplemented = (endpointName, method, alternativeMethod) => req => {
	requestLog(endpointName, method, req);
	throw httpErrors(
		405,
		`${method} is unimplemented. Use ${alternativeMethod}`,
	);
};

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
const { getHandler } = require('../../packages/api-rest-get-handler');
// const {postHandler} = require('../../packages/api-rest-post-handler');
// const {patchHandler} = require('../../packages/api-rest-patch-handler');
const { deleteHandler } = require('../../packages/api-rest-delete-handler');
// const {mergeHandler} = require('../../packages/api-rest-merge-handler');

const getRestApi = ({
	documentStore, // : s3Adaptor,
	// lockFieldsUsingMetadata, //: clientId,
	// updateStream, // : kinesisAdaptor
} = {}) => {
	const router = new express.Router();
	router.use(contextMiddleware);
	router.use(requestId);
	router.use(clientId);
	router.use(bodyParsers);

	router
		.route('/:type/:code')
		.get(controller('GET', getHandler({ documentStore })))
		// 	.post(controller('POST', postHandler({documentStore})))
		// 	.put(unimplemented('PUT', 'PATCH'))
		// 	.patch(controller('PATCH', patchHandler({documentStore})))
		.delete(controller('DELETE', deleteHandler({ documentStore })));

	// router.post('/:type/:code/absorb', controller('POST', mergeHandler({documentStore})));

	router.use(errorToErrors);

	return router;
};

module.exports = {
	getRestApi,
};
