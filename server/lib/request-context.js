/**
	This file uses asyn hooks and ES6 Proxy to
	- maintain a context object throughout the lifecycle of a request
	- provide access to write to this object from anywhere in the apps code
	- decorate every log with the data stored in this conytext object

	Usage
	exports 3 things:
	- middleware - should be one of the first bits of middleeware called by the app
	- setContext - pass in am object or key, value to set a value(s) on teh context
	- logger - Same API as n-logger

* */

const asyncHooks = require('async_hooks');
const nLogger = require('@financial-times/n-logger').default;

const contextStore = {};

const getContext = key => {
	const eid = asyncHooks.executionAsyncId();
	const store = contextStore[eid] || {};
	return key ? store[key] : store;
};

const asyncHook = asyncHooks.createHook({
	init: (asyncId, type, triggerId) => {
		if (triggerId in contextStore) {
			contextStore[asyncId] = contextStore[triggerId];
		}
	},
	destroy: asyncId => delete contextStore[asyncId],
	promiseResolve: () => {},
});

asyncHook.enable();

const logger = new Proxy(nLogger, {
	get: (baseLogger, name) => {
		// each logging method should get request context before logging
		if (['info', 'warn', 'log', 'error', 'debug'].includes(name)) {
			return new Proxy(baseLogger[name], {
				apply: (func, thisArg, args) => {
					// get the request context
					const context = getContext();
					// find the first object in the args
					const firstObjectIndex = args.findIndex(
						arg => typeof arg === 'object',
					);

					if (firstObjectIndex === -1) {
						// if no object is being logged, append the context object to the args
						args.push(context);
					} else {
						// if there is an object, insert the context object to the args in the place after the last object
						args.splice(firstObjectIndex, 0, context);
					}
					return func.apply(thisArg, args);
				},
			});
		}
		return baseLogger[name];
	},
});

const collectRequestMetrics = (context, res) => {
	context = context || getContext();
	logger.info(
		`Request to ${context.path} completed with status ${res.statusCode}`,
		{
			event: 'REQUEST_COMPLETE',
			totalTime: Date.now() - context.start,
			status: res.statusCode,
		},
		context,
	);
};

const middleware = (req, res, next) => {
	const eid = asyncHooks.executionAsyncId();
	contextStore[eid] = {
		start: Date.now(),
		path: req.originalUrl,
		environment: process.env.DEPLOYMENT_STAGE,
	};
	// must pass the context as the finish event is in (begins?) a
	// different async execution context
	res.once('finish', () => collectRequestMetrics(contextStore[eid], res));
	next();
};

const setContext = (key, val) => {
	const eid = asyncHooks.executionAsyncId();
	if (typeof key === 'object') {
		Object.assign(contextStore[eid], key);
	} else {
		contextStore[eid][key] = val;
	}
};

module.exports = {
	setContext,
	getContext,
	middleware,
	logger,
};
