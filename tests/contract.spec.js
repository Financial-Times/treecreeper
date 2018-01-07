const app = require('../server/app.js');
const request = require('supertest');

describe ('Contract - API endpoints', () => {

	describe('GET', () => {
		it.skip('should retrieve all contract nodes from a supplier id', (done) => {
			request(app)
			.get('/api/contracts/makers')
			.set('API_KEY', `${process.env.API_KEY}`)
			.expect(200, {
				makers1: {
					id: 'makers1',
					name: 'Perm developers'
				},
				makers2: {
					id: 'makers2',
					name: 'Contract developers'
				}
			}, done);
		});

		it('should throw 404 for an invalid contract node', (done) => {
			request(app)
			.get('/api/contracts/invalidId')
			.set('API_KEY', `${process.env.API_KEY}`)
			.expect(404, done);
		});
	});
});
