const express = require('express');
const request = require('supertest');
const { setupMocks } = require('../../../test-helpers');
const { getGraphqlApi } = require('..');

describe('graphql', () => {
	let app;

	const namespace = 'api-graphql';
	const mainCode = `${namespace}-main`;

	const { createNodes, createNode, connectNodes } = setupMocks(namespace);

	beforeAll(() => {
		app = express();
		const {
			graphqlHandler,
			listenForSchemaChanges: updateGraphqlApiOnSchemaChange,
		} = getGraphqlApi();

		updateGraphqlApiOnSchemaChange();
		app.post('/graphql', graphqlHandler);
	});

	it('Return a single record', async () => {
		await createNode('MainType', {
			code: mainCode,
			someString: 'name1',
			someEnum: 'First',
		});
		return request(app)
			.post('/graphql')
			.send({
				query: `{
					MainType(code: "${mainCode}") {
						code
						someString
						someEnum
					}}`,
			})
			.expect(200, {
				data: {
					MainType: {
						code: mainCode,
						someEnum: 'First',
						someString: 'name1',
					},
				},
			});
	});

	it('Return metadata for record', async () => {
		await createNode('MainType', {
			code: mainCode,
		});
		return request(app)
			.post('/graphql')
			.send({
				query: `{
					MainType(code: "${mainCode}") {
						code
						_createdTimestamp {formatted}
						_updatedTimestamp {formatted}
						_updatedByClient
						_createdByClient
						_updatedByUser
						_createdByUser
					}}`,
			})
			.expect(200, {
				data: {
					MainType: {
						code: mainCode,
						_createdByClient: 'api-graphql-default-client',
						_createdByUser: 'api-graphql-default-user',
						_createdTimestamp: {
							formatted: '2015-11-15T08:12:27.908000000Z',
						},
						_updatedByClient: 'api-graphql-default-client',
						_updatedByUser: 'api-graphql-default-user',
						_updatedTimestamp: {
							formatted: '2015-11-15T08:12:27.908000000Z',
						},
					},
				},
			});
	});

	it('Returns related entities', async () => {
		const childCode = `${namespace}-child`;
		const [main, child] = await createNodes(
			[
				'MainType',
				{
					code: mainCode,
				},
			],
			['ChildType', { code: childCode }],
		);

		await connectNodes(main, 'HAS_CHILD', child);
		return request(app)
			.post('/graphql')
			.send({
				query: `{
					MainType(code: "${mainCode}") {
						code
						children {code}
					}}`,
			})
			.expect(200, {
				data: {
					MainType: {
						code: mainCode,
						children: [{ code: childCode }],
					},
				},
			});
	});

	it('Returns a list of entities', async () => {
		await createNodes(
			[
				'MainType',
				{
					code: mainCode + 1,
				},
			],
			[
				'MainType',
				{
					code: mainCode + 2,
				},
			],
		);
		return request(app)
			.post('/graphql')
			.send({
				query: `{
					MainTypes (orderBy: code_asc, filter: {code_starts_with: "${mainCode}"}) {
						code
					}}`,
			})
			.expect(200, {
				data: {
					MainTypes: [
						{
							code: mainCode + 1,
						},
						{
							code: mainCode + 2,
						},
					],
				},
			});
	});

	describe('Document properties', () => {
		it('can read Documents when not configured to use docstore', async () => {
			await createNode('MainType', {
				code: mainCode,
				someDocument: 'document',
			});
			return request(app)
				.post('/graphql')
				.send({
					query: `{
					MainType(code: "${mainCode}") {
						someDocument
					}}`,
				})

				.expect(200, {
					data: {
						MainType: {
							someDocument: 'document',
						},
					},
				});
		});

		describe('with document store', () => {
			let docstoreApp;

			beforeAll(() => {
				docstoreApp = express();
				const {
					graphqlHandler,
					listenForSchemaChanges: updateGraphqlApiOnSchemaChange,
				} = getGraphqlApi({
					documentStore: {
						get: async (type, code) => ({
							body: { someDocument: `document for ${code}` },
						}),
					},
				});

				updateGraphqlApiOnSchemaChange();
				docstoreApp.post('/graphql', graphqlHandler);
			});
			it('returns an error if no code provided', async () => {
				await createNode('MainType', {
					code: mainCode,
				});
				return request(docstoreApp)
					.post('/graphql')
					.send({
						query: `{
						MainType(filter: {code: "${mainCode}"}) {
							someDocument
						}}`,
					})
					.expect(200)
					.then(({ body }) =>
						expect(body).toMatchObject({
							errors: [
								{
									message:
										'Must include code in body of query that requests any Document properties',
								},
							],
						}),
					);
			});

			it('retrieves document for single record if code included in query', async () => {
				await createNode('MainType', {
					code: mainCode,
				});
				return request(docstoreApp)
					.post('/graphql')
					.send({
						query: `{
						MainType(filter: {code: "${mainCode}"}) {
							code
							someDocument
						}}`,
					})
					.expect(200, {
						data: {
							MainType: {
								code: mainCode,
								someDocument: `document for ${mainCode}`,
							},
						},
					});
			});

			it('retrieves document for multiple records if code included in query', async () => {
				await createNodes(
					[
						'MainType',
						{
							code: mainCode + 1,
						},
					],
					[
						'MainType',
						{
							code: mainCode + 2,
						},
					],
				);
				return request(docstoreApp)
					.post('/graphql')
					.send({
						query: `{
						MainTypes (orderBy: code_asc, filter: {code_starts_with: "${mainCode}"}){
							code
							someDocument
						}}`,
					})
					.expect(200, {
						data: {
							MainTypes: [
								{
									code: mainCode + 1,
									someDocument: `document for ${mainCode}1`,
								},
								{
									code: mainCode + 2,
									someDocument: `document for ${mainCode}2`,
								},
							],
						},
					});
			});
		});
	});

	describe('with extended typeDef and resolvers', () => {
		let testApp;

		beforeAll(() => {
			testApp = express();
			const {
				graphqlHandler,
				listenForSchemaChanges: updateGraphqlApiOnSchemaChange,
			} = getGraphqlApi({
				typeDefs: [
					`type ExtendedType {
							code: String
							someString: String
							someFloat: Float
							someEnum: AnEnum
						}`,
					`extend type MainType {
					extended: ExtendedType @neo4j_ignore
			   }`,
				],
				resolvers: {
					MainType: {
						extended: () => ({
							code: `${namespace}-extend`,
							someString: 'some string',
							someFloat: 20.21,
							someEnum: 'First',
						}),
					},
				},
			});

			updateGraphqlApiOnSchemaChange();
			testApp.post('/graphql', graphqlHandler);
		});

		it('returns data from extended resolver', async () => {
			await createNode('MainType', {
				code: mainCode,
			});
			return request(testApp)
				.post('/graphql')
				.send({
					query: `{
					MainType(filter: {code: "${mainCode}"}) {
						code
						extended {
							code
							someString
							someFloat
							someEnum
						}
					}}`,
				})
				.expect(200, {
					data: {
						MainType: {
							code: mainCode,
							extended: {
								code: `${namespace}-extend`,
								someString: 'some string',
								someFloat: 20.21,
								someEnum: 'First',
							},
						},
					},
				});
		});
	});
});
