const fetch = require('node-fetch');
const schemaPublisher = require('@financial-times/tc-schema-publisher');
const request = require('supertest');

let getApp;

jest.useFakeTimers();
jest.mock('@financial-times/tc-schema-publisher', () => ({
	sendSchemaToS3: jest.fn(),
}));
delete process.env.TREECREEPER_TEST;

describe('schema polling updates', () => {
	// beforeAll(() => {

	// });
	// afterAll(() => {
	// 	process.env.TREECREEPER_TEST = 'true';
	// });
	describe('api updates', () => {
		let app;
		beforeAll(async () => {
			process.env.NODE_ENV = 'production';
			process.env.NEO4J_BOLT_USER = 'test-user';
			process.env.NEO4J_BOLT_PASSWORD = 'test-password';
			delete process.env.TREECREEPER_SCHEMA_DIRECTORY;
			process.env.TREECREEPER_SCHEMA_URL = 'http://example.com';
			schemaPublisher.sendSchemaToS3.mockResolvedValue(true);
			fetch.config.fallbackToNetwork = false;
			fetch
				.getOnce(`${process.env.TREECREEPER_SCHEMA_URL}/schema.json`, {
					version: 'not-null',
					schema: {
						types: [
							{
								name: 'OldTestType',
								description: 'A test type.',
								properties: {
									code: {
										type: 'Code',
										description: 'The code.',
										canIdentify: true,
									},
									testProp: {
										type: 'Word',
										description: 'A test property.',
									},
								},
							},
						],
						enums: {},
						stringPatterns: {},
						primitiveTypes: {
							Word: { graphql: 'String', component: 'Text' },
						},
					},
				})
				.getOnce(
					`${process.env.TREECREEPER_SCHEMA_URL}/schema.json`,
					{
						version: 'new-test',
						schema: {
							types: [
								{
									name: 'TestType',
									description: 'A test type.',
									properties: {
										code: {
											type: 'Code',
											description: 'The code.',
											canIdentify: true,
										},
										testProp: {
											type: 'Word',
											description: 'A test property.',
										},
									},
								},
							],
							enums: {},
							stringPatterns: {},
							primitiveTypes: {
								Word: { graphql: 'String', component: 'Text' },
							},
						},
					},
					{ overwriteRoutes: false },
				)
				.catch(200);
			({ getApp } = require('..'));
			app = await getApp({
				republishSchemaPrefix: 'custom',
				republishSchema: true,
				schemaOptions: { updateMode: 'poll', ttl: 100 },
			});
			await fetch.flush(true);
			jest.advanceTimersByTime(101);
			await fetch.flush(true);
		});
		afterAll(() => {
			process.env.NODE_ENV = 'test';
			delete process.env.NEO4J_BOLT_USER;
			delete process.env.NEO4J_BOLT_PASSWORD;
			fetch.config.fallbackToNetwork = 'always';
			fetch.reset();
			jest.resetModules();
		});

		describe('success', () => {
			it('constructs new graphql api', async () => {
				return request(app, { useCached: false })
					.post('/graphql')
					.send({
						query: `
						{
							TestType {
								testProp
							}
						}
					`,
					})
					.set('client-id', 'polling-client')
					.expect(200);
			});

			it('updates validation rules', async () => {
				return request(app, { useCached: false })
					.head(`/rest/SimpleGraphBranch/main-code-${Date.now()}`)
					.set('client-id', 'polling-client')
					.expect(400);
			});

			it('writes the latest schema to the S3 api endpoint', () => {
				expect(schemaPublisher.sendSchemaToS3).toHaveBeenCalledWith(
					'custom',
				);
			});

			it('surfaces good state via a method', async () => {
				expect(app.treecreeper.isSchemaUpdating()).toEqual(true);
			});
		});
		describe('failure', () => {
			beforeAll(async () => {
				process.env.NODE_ENV = 'production';
							process.env.NEO4J_BOLT_USER = 'test-user';
			process.env.NEO4J_BOLT_PASSWORD = 'test-password';
				schemaPublisher.sendSchemaToS3.mockClear();

				fetch
					.getOnce(
						`${process.env.TREECREEPER_SCHEMA_URL}/schema.json`,
						{
							version: 'new-test2',
							schema: {
								types: [
									{
										name: 'InvalidType',
										description: 'An invalid type.',
										properties: {
											// have added some bits that'll generate invalid graphql schema
											'code\nmultiline': {
												type: 'Code',
												description: 'The code.',
											},
											testProp: {
												type: 'Word',
												description: 'A test property.',
											},
										},
									},
								],
								enums: {},
								stringPatterns: {},
								primitiveTypes: {
									Word: {
										graphql: 'String',
										component: 'Text',
									},
								},
							},
						},
						{ overwriteRoutes: false },
					)
					.catch(200);
				jest.advanceTimersByTime(101);
				await fetch.flush(true);
			});
			afterAll(() => {
				process.env.NODE_ENV = 'test';
							delete process.env.NEO4J_BOLT_USER;
			delete process.env.NEO4J_BOLT_PASSWORD;
			});

			it('graphql endpoint still runs on old schema version', async () => {
				await request(app, { useCached: false })
					.post('/graphql')
					.send({
						query: `
							{
								InvalidType {
									testProp
								}
							}
						`,
					})
					.set('client-id', 'polling-client')
					.expect(400);
				await request(app, { useCached: false })
					.post('/graphql')
					.send({
						query: `
							{
								TestType {
									testProp
								}
							}
						`,
					})
					.set('client-id', 'polling-client')
					.expect(200);
			});

			it('does not send the schema to s3', () => {
				expect(schemaPublisher.sendSchemaToS3).not.toHaveBeenCalled();
			});

			it('surfaces failed state via a method', async () => {
				expect(app.treecreeper.isSchemaUpdating()).toEqual(false);
			});
		});
	});

	// Not testing this as directly as I'd like as it's tricky
	it.skip('reinitialises database contraints', async () => {
		const onChange = jest.fn();
		jest.doMock('@financial-times/tc-schema-sdk', () => ({
			init: () => null,
			onChange,
			ready: () => Promise.resolve(),
		}));
		// const { initConstraints } = require('../server/init-db');
		// expect(onChange).toHaveBeenCalledWith(initConstraints);
		jest.dontMock('@financial-times/tc-schema-sdk');
	});
});
