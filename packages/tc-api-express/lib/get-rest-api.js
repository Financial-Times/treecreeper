const httpErrors = require('http-errors');
const express = require('express');
const {
	logger,
	setContext,
} = require('@financial-times/tc-api-express-logger');
const {
	headHandler,
	getHandler,
	deleteHandler,
	postHandler,
	patchHandler,
	absorbHandler,
} = require('@financial-times/tc-api-rest-handlers');

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

const allowedMethodsMiddleware = allowedRestMethods => (req, res, next) => {
	let appMethod = req.method.toUpperCase();
	if (appMethod === 'POST') {
		const { type, code } = req.params;
		// the ABOSRB method doesn't exist in HTTP verb actually, so we can determine from accessing url
		if (req.url.indexOf(`/${type}/${code}/absorb`) === 0) {
			appMethod = 'ABSORB';
		}
	}
	if (!allowedRestMethods.includes(appMethod)) {
		throw httpErrors(405, `${appMethod} is unimplemented`);
	}
	next();
};

const controller = (method, handler) => (req, res, next) => {
	requestLog('rest', method, req);
	handler({
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
		...req.params,
	})
		.then(({ status, body }) =>
			body ? res.status(status).json(body) : res.status(status).end(),
		)
		.catch(next);
};

const getRestApi = (config = {}) => {
	// {
	// 	documentStore, // : s3Adaptor,
	// 	// lockFieldsUsingMetadata, //: clientId,
	// 	// updateStream, // : kinesisAdaptor
	// } = {}) => {
	const router = new express.Router();
	const {
		restMethods = ['HEAD', 'GET', 'POST', 'DELETE', 'PATCH', 'ABSORB'],
	} = config;
	const allowedMethods = restMethods.map(method => method.toUpperCase());

	router
		.route('/:type/:code')
		.all(allowedMethodsMiddleware(allowedMethods))
		.head(controller('HEAD', headHandler(config)))
		.get(controller('GET', getHandler(config)))
		.post(controller('POST', postHandler(config)))
		// 	.put(unimplemented('PUT', 'PATCH'))
		.patch(controller('PATCH', patchHandler(config)))
		.delete(controller('DELETE', deleteHandler(config)));

	router.post(
		'/:type/:code/absorb/:codeToAbsorb',
		allowedMethodsMiddleware(allowedMethods),
		controller('ABSORB', absorbHandler(config)),
	);

	router.use(errorToErrors);

	return router;
};

module.exports = {
	getRestApi,
};
