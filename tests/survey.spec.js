const app = require('../server/app.js');
const request = require('supertest');

describe('Survey - API endpoints', () => {
    describe('GET', () => {
        ['/api/survey/pci','/api/survey/ra', '/api/survey/tdd',
        '/api/survey/dp','/api/survey/as','/api/survey/abc',
        '/api/survey/bcm'].map( survey => {
            it(` GET should retrieve ${survey} survey node`, (done) => {
                request(app)
                .get(survey)
                .set('API_KEY', `${process.env.API_KEY}`)
                .expect(200, done);
            });
        });

        it ('should throw 404 for invalid survey node,', (done) => {
            request(app)
            .get('/invalidId')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect(404, done);
        });
    });

    describe('POST', () => {
        before(() => request(app)
        .post('/api/survey')
        .set('API_KEY', `${process.env.API_KEY}`)
        .send({node: {'id': 'surveytest', 'title': 'Test Survey', 'version': 0}}));

        after(() => request(app)
        .delete('/api/survey/surveytest')
        .set('API_KEY', `${process.env.API_KEY}`)
        .end(process.exit()));

        it('POST should not allow duplicate nodes', (done) => {
            request(app)
            .post('/api/survey')
            .set('API_KEY', `${process.env.API_KEY}`)
            .send({ node: {'id': 'surveytest', 'title': 'Test Survey', 'version': 0}})
            .expect(400, done);
        });
    });
});
