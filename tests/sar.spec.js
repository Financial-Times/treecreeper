const app = require('../server/app.js');
const request = require('supertest');

describe('SAR', () => {
	describe('POST', (done) => {
		it('has status code 200', () => {
			request(app)
			.post('/api/sar')
			.set('API_KEY', `${process.env.API_KEY}`)
			.send({sar: 'this is my sar'})
			.expect(200, done);
		});
	});
});
