const casual = require('casual');
const logger = require('@financial-times/n-logger').default;
const sinon = require('sinon');
const app = require('../server/app.js');
const request = require('./helpers/supertest').getNamespacedSupertest(
	'graphql'
);
const { executeQuery } = require('../server/data/db-connection');
const security = require('../server/middleware/security');
const {
	createMockSchema,
	resolvers
} = require('../server/data/graphql-schema');
const { graphql } = require('graphql');

const UNIQUE_ATTRIBUTE_KEY = 'uniqueAttribute';
const UNIQUE_ATTRIBUTE_VALUE = 'GRAPHQL_INT_TESTS';

describe('Integration - GraphQL', () => {
	// always seed the casual generator with a static seed so that tests are deterministic
	casual.seed(123);
	let sandbox;
	const typeFields = {};
	const typeMocks = {};

	const mockGraphQlQuery = async query => {
		const mockSchema = createMockSchema({
			String() {
				return casual.word;
			},
			ServiceTier() {
				return 'Platinum';
			},
			System: () => ({
				serviceTier: () => 'Platinum'
			})
		});
		return await graphql(mockSchema, query);
	};

	const listFields = (fields = []) =>
		fields
			.filter(({ type: { kind } }) => !['LIST', 'OBJECT'].includes(kind))
			.map(({ name }) => name)
			.join('\n');

	const getMocksForType = async (type, typeQuery) => {
		logger.debug('Fetching graphql schema for type', { type });
		const fields = await mockGraphQlQuery(`
				query getTypes {
					__schema {
						types {
							name
							fields {
								name
								type {
									name
									kind
								}
							}
						}
					}
				}
			`)
			.then(
				({ data }) =>
					data.__schema.types.find(
						({ name }) => name.toUpperCase() === type.toUpperCase()
					).fields
			)
			.catch(error => {
				logger.error('Given schema type did not exist', error, type);
				throw error;
			});

		logger.debug('Fetching graphql fields for type', { type, typeQuery });

		const mocks = await mockGraphQlQuery(`
				query get${typeQuery} {
					${typeQuery} {
						${listFields(fields)}
					}
				}
			`).then(({ data }) => data[typeQuery]);

		logger.debug('Created mocks for type', { type, mocks });

		return {
			mocks,
			fields
		};
	};

	const addUniqueAttributes = item =>
		Object.assign({}, item, { [UNIQUE_ATTRIBUTE_KEY]: UNIQUE_ATTRIBUTE_VALUE });

	const mapEnumFields = (item, fieldSchema) =>
		Object.entries(item).reduce((result, [key, value]) => {
			const { type } = fieldSchema.find(({ name }) => name === key) || {};
			if (type && type.kind === 'ENUM') {
				return Object.assign({}, result, {
					[key]: resolvers.enumResolvers[type.name][value]
				});
			}
			return result;
		}, item);

	const populateDatabaseMocks = async (type, typeQuery) => {
		const { mocks, fields } = await getMocksForType(type, typeQuery).then(
			result => {
				result.mocks = Array.isArray(result.mocks)
					? result.mocks
					: [result.mocks];
				return result;
			}
		);

		typeFields[type] = fields;
		typeMocks[type] = mocks;

		const props = mocks
			.map(mock => mapEnumFields(mock, fields))
			.map(addUniqueAttributes);

		logger.debug('Creating graphql database stubs', { type, props });

		const createQuery = `UNWIND $props AS map CREATE (n:${type}) SET n = map`;
		return executeQuery(createQuery, { props });
	};

	beforeEach(async function() {
		sandbox = sinon.createSandbox();
		await populateDatabaseMocks('System', 'Systems');
	});

	afterEach(async () => {
		sandbox.restore();
		const deleteQuery = `MATCH (a {${UNIQUE_ATTRIBUTE_KEY}: "${UNIQUE_ATTRIBUTE_VALUE}"}) DELETE a`;
		await executeQuery(deleteQuery);
	});

	describe('access control', () => {
		const dummyQuery = {
			query: `{
				Systems {
					code
				}
			}`,
			variables: null,
			operationName: null
		};

		const stubS3o = (req, res) => {
			const cookie = req.get('Cookie');
			const status =
				/s3o_username=.+?;?/.test(cookie) && /s3o_password=.+?;?/.test(cookie)
					? 200
					: 400;
			return res.sendStatus(status);
		};

		it('should allow access to GET /graphiql behind s3o', () => {
			sandbox.stub(security, 'requireS3o').callsFake(stubS3o);

			return request(app, { useCached: false })
				.get('/graphiql')
				.set('Cookie', 's3o_username=test; s3o_password=test')
				.expect(200);
		});

		it('should not allow access to GET /graphiql if s3o fails', () => {
			return request(app)
				.get('/graphiql')
				.expect(302);
		});

		it('should allow access to POST /api/graphql behind s3o', () => {
			sandbox.stub(security, 'requireApiKeyOrS3o').callsFake(stubS3o);
			return request(app, { useCached: false })
				.post('/graphql')
				.send(dummyQuery)
				.set('Cookie', 's3o_username=test; s3o_password=test')
				.expect(200);
		});

		it('should allow access to POST /graphql with an API key header and client id', () => {
			return request(app)
				.post('/graphql')
				.send(dummyQuery)
				.namespacedAuth()
				.expect(200);
		});

		it('should not access to POST /graphql if there is no valid s3o auth or API key header', () => {
			return request(app)
				.post('/graphql', dummyQuery)
				.expect(403);
		});
	});

	it('GET for a single system returns a single system', () => {
		return request(app)
			.post('/graphql')
			.send({
				query: `{
					System(code: "${typeMocks['System'][0].code}") {
						${listFields(typeFields['System'])}
					}}`
			})
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({ data: { System: typeMocks['System'][0] } });
			});
	});

	it('GET for systems returns a list of systems', () => {
		return request(app)
			.post('/graphql')
			.send({
				query: `{
					Systems {
						${listFields(typeFields['System'])}
					}}`
			})
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				typeMocks['System'].forEach(mock => {
					const result = body.data.Systems.find(s => s.code === mock.code);
					expect(result).not.toBeUndefined();
					expect(result).toEqual(mock);
				});
			});
	});
});
