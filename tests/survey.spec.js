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
            .expect(404, process.exit(), done);
        });
    });
});
