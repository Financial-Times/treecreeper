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

class Logger {
	constructor(initialContext = {}) {
		this.contextStore = initialContext;
		this.init();
	}

	init() {
		const asyncHook = asyncHooks.createHook({
			init: (asyncId, type, triggerId) => {
				if (triggerId in this.contextStore) {
					this.contextStore[asyncId] = this.contextStore[triggerId];
				}
			},
			destroy: asyncId => delete this.contextStore[asyncId],
			promiseResolve: () => {},
		});

		asyncHook.enable();
	}

	setContext(key, val) {
		const eid = asyncHooks.executionAsyncId();
		if (typeof key === 'object') {
			Object.assign(this.contextStore[eid], key);
		} else {
			this.contextStore[eid][key] = val;
		}
	}

	getContext(key) {
		const eid = asyncHooks.executionAsyncId();
		const store = this.contextStore[eid] || {};
		return key ? store[key] : store;
	}

	collectRequestMetrics(context, res) {
		context = context || this.getContext();
		this.info(
			`Request to ${context.path} completed with status ${res.statusCode}`,
			{
				event: 'REQUEST_COMPLETE',
				totalTime: Date.now() - context.start,
				status: res.statusCode,
			},
			context,
		);
	}
}

const createLogger = () => {
	const logger = new Logger();
	return new Proxy(logger, {
		get: (baseLogger, name) => {
			// each logging method should get request context before logging
			if (['info', 'warn', 'log', 'error', 'debug'].includes(name)) {
				return new Proxy(nLogger[name], {
					apply: (func, thisArg, args) => {
						// get the request context
						const context = logger.getContext();
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
};

const loggerMiddleware = logger => (req, res, next) => {
	const eid = asyncHooks.executionAsyncId();
	logger.contextStore[eid] = {
		start: Date.now(),
		path: req.originalUrl,
		environment: process.env.DEPLOYMENT_STAGE,
	};
	// must pass the context as the finish event is in (begins?) a
	// different async execution context
	res.once('finish', () =>
		logger.collectRequestMetrics(logger.contextStore[eid], res),
	);
	next();
};

module.exports = {
	createLogger,
	loggerMiddleware,
	Logger,
};
