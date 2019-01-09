const supertest = require('supertest');

let cache;

const API_KEY = process.env.API_KEY;

supertest.Test.prototype.auth = function(clientId) {
	return this.set('API_KEY', API_KEY).set(
		'client-id',
		clientId || 'test-client-id'
	);
};

const request = (app, { useCached = true } = {}) => {
	if (useCached && typeof cache !== 'undefined') {
		return cache;
	}
	const instance =
		typeof app === 'function' ? supertest(app()) : supertest(app);

	if (useCached) {
		cache = instance;
	} else {
		cache = undefined;
	}

	return instance;
};

const originalSend = supertest.Test.prototype.send;

const getNamespacedSupertest = namespace => (...args) => {
	const req = request(...args);

	['post', 'patch', 'get', 'delete', 'put'].forEach(methodName => {
		const method = req[methodName].bind(req);
		req[methodName] = function(...args) {
			const test = method(...args);

			test.namespacedAuth = function() {
				return this.set('API_KEY', API_KEY)
					.set('client-id', `${namespace}-client`)
					.set('x-request-id', `${namespace}-request`);
			};
			test.send = function(json) {
				return originalSend.bind(this)(json);
			};

			return test;
		};
	});

	return req;
};

module.exports = { getNamespacedSupertest };
