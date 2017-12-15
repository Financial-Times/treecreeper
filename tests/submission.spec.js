const app = require('../server/app.js');
const request = require('supertest');

describe('Submission - API endpoints', () => {

    describe('GET', () => {
        it('should retrieve a submission node', (done) => {
            request(app)
            .get('/api/submission/danger1tdd')
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
        .send({node: {'id': 'submtest'}}));

        after(() => request(app)
        .delete('/api/submission/submtest')
        .set('API_KEY', `${process.env.API_KEY}`));

        it('GET should retrieve the new submission node - status code 200', (done) => {
            request(app)
            .get('/api/submission/submtest')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect(200, done);
        });

        it('POST should not allow duplicate nodes', (done) => {
            request(app)
            .post('/api/submission')
            .set('API_KEY', `${process.env.API_KEY}`)
            .send({ node: {'id': 'submtest'}})
            .expect(400, done);
        });
    });
});
