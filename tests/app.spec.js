const app = require('../server/app.js');
const request = require('supertest');

describe('root', () => {
	it('GET root - status code 200', (done) => {
		request(app)
		.get('/')
		.set('API_KEY', `${process.env.API_KEY}`)
		.expect(200,'biz op api', done);
	});
});
