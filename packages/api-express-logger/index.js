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

let isAsyncHookCreated = false;

class LogContext {
	constructor(initialContext = {}) {
		this.contextStore = initialContext;
		this.init();
	}

	init() {
		// Guard for duplicate setup hooks
		if (isAsyncHookCreated) {
			return;
		}
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
		isAsyncHookCreated = true;
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

const hasMethod = (logger, method) =>
	method in logger && typeof logger[method] === 'function';

const createLogger = (userDefinedLogger = {}) => {
	const logContext = new LogContext();

	return new Proxy(logContext, {
		get: (baseLogger, name) => {
			// each logging method should get request context before logging
			if (['info', 'warn', 'log', 'error', 'debug'].includes(name)) {
				// If user defined logger has each logging method, call it with context
				// Otherwise, proxy nLogger
				const loggingFunction = hasMethod(userDefinedLogger, name)
					? userDefinedLogger[name]
					: nLogger[name];

				return new Proxy(loggingFunction, {
					apply: (func, thisArg, args) => {
						// get the request context
						const context = logContext.getContext();
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
			// Paticular case, user choosed logger with pino, we should proxy `child()` with context
			if (name === 'child' && hasMethod(userDefinedLogger, 'child')) {
				const childLoggerFunction = userDefinedLogger.child;

				return new Proxy(childLoggerFunction, {
					apply: (func, thisArg, args) => {
						// get the request context
						const context = logContext.getContext();

						// The pino's child binding should be passed only one object
						// @see https://github.com/pinojs/pino/blob/master/docs/api.md#loggerchildbindings--logger
						if (args.length === 0) {
							// if no object is being logged, append the context object to the args
							args.push(context);
						} else {
							// if bindings are supplied, merge with context
							args[0] = Object.assign({}, context, args[0]);
						}
						return func.apply(thisArg, args);
					},
				});
			}
			return userDefinedLogger[name] || baseLogger[name];
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
};
