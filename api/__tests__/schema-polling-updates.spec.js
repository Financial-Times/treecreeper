const fetch = require('node-fetch');
const schema = require('../../schema');
const request = require('./helpers/supertest').getNamespacedSupertest(
	'schema-polling',
);
const { getSchemaFilename } = require('../../packages/schema-utils');

jest.useFakeTimers();

describe('schema polling updates', () => {
	describe('api updates', () => {
		let app;
		beforeAll(async () => {
			process.env.NODE_ENV = 'production';
			schema.sendSchemaToS3 = jest.fn();

			fetch.config.fallbackToNetwork = false;
			fetch
				.getOnce(
					`${process.env.SCHEMA_BASE_URL}/${getSchemaFilename()}`,
					{ version: 'not-null' },
				)
				.getOnce(
					`${process.env.SCHEMA_BASE_URL}/${getSchemaFilename()}`,
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
											type: 'Paragraph',
											description: 'A test property.',
										},
									},
								},
							],
							enums: {},
							stringPatterns: {},
						},
					},
					{ overwriteRoutes: false },
				)
				.catch(200);
			const { schemaReady } = require('../server/lib/init-schema');
			app = require('../server/app');
			// await fetch.flush(true);
			await schemaReady;
			jest.advanceTimersByTime(60001);
			await fetch.flush(true);
		});
		afterAll(() => {
			process.env.NODE_ENV = 'test';
			fetch.config.fallbackToNetwork = 'always';
			fetch.reset();
			jest.resetModules();
		});
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
				.namespacedAuth()
				.expect(200);
		});

		it('updates validation rules', async () => {
			return request(app, { useCached: false })
				.post(`/v2/node/System/system-code-${Date.now()}`)
				.send({ name: 'hello' })
				.namespacedAuth()
				.expect(400);
		});

		it('writes the latest schema to the S3 api endpoint', () => {
			expect(schema.sendSchemaToS3).toHaveBeenCalledWith('api');
		});

		describe('failure', () => {
			let schemaVersionCheck;
			beforeAll(async () => {
				process.env.NODE_ENV = 'production';
				schema.sendSchemaToS3 = jest.fn();

				fetch
					.getOnce(
						`${process.env.SCHEMA_BASE_URL}/${getSchemaFilename()}`,
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
												type: 'Paragraph',
												description: 'A test property.',
											},
										},
									},
								],
								enums: {},
								stringPatterns: {},
							},
						},
						{ overwriteRoutes: false },
					)
					.catch(200);
				schemaVersionCheck = require('../server/health/schema-version.js');
				jest.advanceTimersByTime(20001);
				await fetch.flush(true);
			});
			afterAll(() => {
				process.env.NODE_ENV = 'test';
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
					.namespacedAuth()
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
					.namespacedAuth()
					.expect(200);
			});

			it('does not send the schema to s3', () => {
				expect(schema.sendSchemaToS3).not.toHaveBeenCalled();
			});

			it('triggers the healthcheck to fail', async () => {
				jest.advanceTimersByTime(300001);
				const checkObj = await schemaVersionCheck;
				expect(checkObj.getStatus().ok).toEqual(false);
			});
		});
	});

	// Not testing this as directly as I'd like as it's tricky
	it('reinitialises database contraints', async () => {
		const on = jest.fn();
		jest.doMock('../../schema', () => ({
			on,
			configure: () => null,
			startPolling: () => Promise.resolve(),
		}));
		const { initConstraints } = require('../server/init-db');
		expect(on).toHaveBeenCalledWith('change', initConstraints);
		jest.dontMock('../../schema');
	});
});
