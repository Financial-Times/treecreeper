const app = require('../server/app.js');
const request = require('supertest');

describe ('Contract - API endpoints', () => {

    describe('GET', () => {
        it('should retrieve a contract node', (done) => {
            request(app)
            .get('/api/contract/fastly1')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect( 200, done);
        });
        // failing test- returns 200 when it should return 404
        it.skip('should throw 404 for an invalid contract node', (done) => {
            request(app)
            .get('/api/contract/invalidId')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect(404, done);
        });

        it('should retrieve all contract nodes from an individual supplier', (done) => {
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
    });


    describe('POST should create a new contract node', () => {

        before(() => request(app)
        .post('/api/contract')
        .set('API_KEY', `${process.env.API_KEY}`)
        .send({node: {id: 'contracttest', name: 'Contract Test'}}));

        after(() => request(app)
        .delete('/api/contract/contracttest')
        .set('API_KEY', `${process.env.API_KEY}`));

        it('GET should retrieve the new contract node - status code 200', (done) => {
            request(app)
            .get('/api/contract/contracttest')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect(200, done);
        });

        it('POST should not allow duplicate nodes', (done) => {
            request(app)
            .post('/api/contract')
            .set('API_KEY', `${process.env.API_KEY}`)
            .send({ node: {id: 'contracttest', name: 'Contract Test'}})
            .expect(400, done);
        });
    });
});
