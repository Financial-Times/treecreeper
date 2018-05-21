const supertest = require('supertest');

let cache;

const API_KEY = process.env.API_KEY;

supertest.Test.prototype.auth = function() {
	return this.set('API_KEY', API_KEY).set('client-id', 'test-client-id');
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

module.exports = request;
