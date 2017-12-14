const { isEqual, orderBy } = require('lodash/fp');
const app = require('../server/app.js');
const request = require('supertest');

describe('Supplier - API endpoints', () => {
    describe('GET', () => {

        it('should retrieve a supplier node', (done) => {
            request(app)
            .get('/api/supplier/akamai')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect(200, done);
        });

        it('should throw 404 for invalid supplier node', (done) => {
            request(app)
            .get('/api/supplier/invalidId')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect(404, done);
        });

        it('should retrieve all supplier nodes', (done) => {

            const expected = [
                { name: 'Akamai', term: '1 Year',
                address: 'Lorem St', id: 'akamai',
                contact: 'e@mail.com' },
                { name: 'Danger Co', term: '1 Year',
                address: 'Lorem St', id: 'danger',
                contact: 'e@mail.com' },
                { name: 'Fairtlough Ltd', term: '10 Years',
                address: 'Lorem St', id: 'a0z0e000002qsbz',
                contact: 'e@mail.com' },
                { name: 'Fastly', term: '1 Year',
                address: 'Lorem St', id: 'fastly',
                contact: 'e@mail.com' },
                { name: 'Makers Academy', term: '10 Years',
                address: 'Lorem St', id: 'makers',
                contact: 'e@mail.com' },
            ];

            request(app)
            .get('/api/suppliers')
            .set('API_KEY', `${process.env.API_KEY}`)
            .expect( response => {
                const sortedResponse = orderBy(['name'], ['asc'], response.body );
                if (!isEqual(sortedResponse, expected)) {
                    throw new Error('GET should retrieve all supplier nodes- failed');
                }
            })
            .end( () => {
                done();
            });
        });
    });
});
