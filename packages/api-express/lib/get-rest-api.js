const express = require('express');
const {
	headHandler,
	getHandler,
	deleteHandler,
	postHandler,
	patchHandler,
	absorbHandler,
} = require('../../../packages/api-rest-handlers');
const Composer = require('./composer');
const { composeDocumentStore } = require('../../api-s3-document-store');

const { errorToErrors } = require('../middleware/errors');

const requestLog = (logger, method, req, endpointName = 'rest') => {
	logger.setContext({
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

const controller = (method, handler, logger) => (req, res, next) => {
	requestLog(logger, method, req, 'rest');
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
		.then(({ status, body }) =>
			body ? res.status(status).json(body) : res.status(status).end(),
		)
		.catch(next);
};

const getRestApi = (options = {}) => {
	// {
	// 	documentStore, // : s3Adaptor,
	// 	// lockFieldsUsingMetadata, //: clientId,
	// 	// updateStream, // : kinesisAdaptor
	// } = {}) => {
	const router = new express.Router();
	const { logger } = options;
	const composedModules = new Composer(
		options,
		composeDocumentStore,
		// and more composers
	).toObject();

	router
		.route('/:type/:code')
		.head(controller('HEAD', headHandler(composedModules), logger))
		.get(controller('GET', getHandler(composedModules), logger))
		.post(controller('POST', postHandler(composedModules), logger))
		// 	.put(unimplemented('PUT', 'PATCH'))
		.patch(controller('PATCH', patchHandler(composedModules), logger))
		.delete(controller('DELETE', deleteHandler(composedModules), logger));

	router.post(
		'/:type/:code/absorb/:codeToAbsorb',
		controller('ABSORB', absorbHandler(composedModules), logger),
	);

	router.use(errorToErrors(logger));

	return router;
};

module.exports = {
	getRestApi,
};
