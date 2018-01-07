const app = require('../server/app.js');
const request = require('supertest');

describe('Submission - API endpoints', () => {

    describe('GET', () => {

        it.skip('should retrieve a submission node, given a valid contract and survey id', (done) => {
            request(app)
            .get('/api/submissions/ab40e000000caszsa0/as')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect(200, done);
        });

        it('should throw 404 for invalid submission node', (done) => {
            request(app)
            .get('/api/submissions/invalidId/as')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect(404, done);
        });

        it.skip('should retrieve a submission node, given a valid submission id', (done) => {
            request(app)
            .get('/api/submission/asab40e000000caszsa0')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect(200, done);
        });

        it('should throw 404 for invalid submission node', (done) => {
            request(app)
            .get('/api/submission/invalidId')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect(404, done);
        });
    });

    describe('POST', () => {
        before(() => request(app)
        .post('/api/submission')
        .set('API_KEY', `${process.env.API_KEY}`)
        .send({node: {contractId: 'ab40e000000caszsa0', id: 'tddab40e000000caszsa0'}}));

        after(() => request(app)
        .delete('/api/submission/tddab40e000000caszsa0')
        .set('API_KEY', `${process.env.API_KEY}`)
    );

    it('GET should retrieve the new submission node - status code 200', (done) => {
        request(app)
        .get('/api/submission/tddab40e000000caszsa0')
        .set('API_KEY', `${process.env.API_KEY}`)
        .expect(200, done);
    });

    it('POST should not allow duplicate nodes', (done) => {
        request(app)
        .post('/api/submission')
        .set('API_KEY', `${process.env.API_KEY}`)
        .send({ node: {contractId: 'ab40e000000caszsa0', id: 'tddab40e000000caszsa0'}})
        .expect(400, done);
    });
});
});
