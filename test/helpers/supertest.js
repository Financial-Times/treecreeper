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

const getNamespacedSupertest = (namespace, includeClientUserId = true) => (
	...requestArgs
) => {
	const req = request(...requestArgs);

	['post', 'patch', 'get', 'delete', 'put'].forEach(methodName => {
		const method = req[methodName].bind(req);
		req[methodName] = function(...methodArgs) {
			const test = method(...methodArgs);

			test.namespacedAuth = function namespacedAuth() {
				const headers = this.set('API_KEY', API_KEY)
					.set('client-user-id', `${namespace}-user`)
					.set('x-request-id', `${namespace}-request`);

				/* This is a bad hack to prevent client-id being set, in order to test
				that an error is thrown when trying to lock fields */
				if (includeClientUserId) {
					headers.set('client-id', `${namespace}-client`);
				}

				return headers;
			};

			return test;
		};
	});

	return req;
};

module.exports = { getNamespacedSupertest };
