const supertest = require('supertest');

let cache;

const { API_KEY } = process.env;

supertest.Test.prototype.auth = function auth(clientId) {
	return this.set('API_KEY', API_KEY).set(
		'client-id',
		clientId || 'test-client-id',
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

const getNamespacedSupertest = namespace => (...requestArgs) => {
	const req = request(...requestArgs);

	['post', 'patch', 'get', 'delete', 'put'].forEach(methodName => {
		const method = req[methodName].bind(req);
		req[methodName] = function(...methodArgs) {
			const test = method(...methodArgs);

			test.namespacedAuth = function namespacedAuth() {
				return this.set('API_KEY', API_KEY)
					.set('client-id', `${namespace}-client`)
					.set('client-user-id', `${namespace}-user`)
					.set('x-request-id', `${namespace}-request`);
			};

			return test;
		};
	});

	return req;
};

module.exports = { getNamespacedSupertest };
