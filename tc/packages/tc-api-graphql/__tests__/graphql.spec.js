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
		await createNode('SimpleGraphBranch', {
			code: mainCode,
			stringProperty: 'name1',
			booleanProperty: true,
		});
		return request(app)
			.post('/graphql')
			.send({
				query: `{
					SimpleGraphBranch(code: "${mainCode}") {
						code
						stringProperty
						booleanProperty
					}}`,
			})
			.expect(200, {
				data: {
					SimpleGraphBranch: {
						code: mainCode,
						booleanProperty: true,
						stringProperty: 'name1',
					},
				},
			});
	});

	it('Return metadata for record', async () => {
		await createNode('SimpleGraphBranch', {
			code: mainCode,
		});
		return request(app)
			.post('/graphql')
			.send({
				query: `{
					SimpleGraphBranch(code: "${mainCode}") {
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
					SimpleGraphBranch: {
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
		const leafCode = `${namespace}-leaf`;
		const [main, leaf] = await createNodes(
			[
				'SimpleGraphBranch',
				{
					code: mainCode,
				},
			],
			['SimpleGraphLeaf', { code: leafCode }],
		);

		await connectNodes(main, 'HAS_LEAF', leaf);
		return request(app)
			.post('/graphql')
			.send({
				query: `{
					SimpleGraphBranch(code: "${mainCode}") {
						code
						leaves {code}
					}}`,
			})
			.expect(200, {
				data: {
					SimpleGraphBranch: {
						code: mainCode,
						leaves: [{ code: leafCode }],
					},
				},
			});
	});

	it('Returns a list of entities', async () => {
		await createNodes(
			[
				'SimpleGraphBranch',
				{
					code: mainCode + 1,
				},
			],
			[
				'SimpleGraphBranch',
				{
					code: mainCode + 2,
				},
			],
		);
		return request(app)
			.post('/graphql')
			.send({
				query: `{
					SimpleGraphBranches (orderBy: code_asc, filter: {code_starts_with: "${mainCode}"}) {
						code
					}}`,
			})
			.expect(200, {
				data: {
					SimpleGraphBranches: [
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
			await createNode('SimpleGraphBranch', {
				code: mainCode,
				documentProperty: 'document',
			});
			return request(app)
				.post('/graphql')
				.send({
					query: `{
					SimpleGraphBranch(code: "${mainCode}") {
						documentProperty
					}}`,
				})

				.expect(200, {
					data: {
						SimpleGraphBranch: {
							documentProperty: 'document',
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
							body: { documentProperty: `document for ${code}` },
						}),
					},
				});

				updateGraphqlApiOnSchemaChange();
				docstoreApp.post('/graphql', graphqlHandler);
			});
			it('returns an error if no code provided', async () => {
				await createNode('SimpleGraphBranch', {
					code: mainCode,
				});
				return request(docstoreApp)
					.post('/graphql')
					.send({
						query: `{
						SimpleGraphBranch(filter: {code: "${mainCode}"}) {
							documentProperty
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
				await createNode('SimpleGraphBranch', {
					code: mainCode,
				});
				return request(docstoreApp)
					.post('/graphql')
					.send({
						query: `{
						SimpleGraphBranch(filter: {code: "${mainCode}"}) {
							code
							documentProperty
						}}`,
					})
					.expect(200, {
						data: {
							SimpleGraphBranch: {
								code: mainCode,
								documentProperty: `document for ${mainCode}`,
							},
						},
					});
			});

			it('retrieves document for multiple records if code included in query', async () => {
				await createNodes(
					[
						'SimpleGraphBranch',
						{
							code: mainCode + 1,
						},
					],
					[
						'SimpleGraphBranch',
						{
							code: mainCode + 2,
						},
					],
				);
				return request(docstoreApp)
					.post('/graphql')
					.send({
						query: `{
						SimpleGraphBranches (orderBy: code_asc, filter: {code_starts_with: "${mainCode}"}){
							code
							documentProperty
						}}`,
					})
					.expect(200, {
						data: {
							SimpleGraphBranches: [
								{
									code: mainCode + 1,
									documentProperty: `document for ${mainCode}1`,
								},
								{
									code: mainCode + 2,
									documentProperty: `document for ${mainCode}2`,
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
							stringProperty: String
							someFloat: Float
							enumProperty: AnEnum
						}`,
					`extend type SimpleGraphBranch {
					extended: ExtendedType @neo4j_ignore
			   }`,
				],
				resolvers: {
					SimpleGraphBranch: {
						extended: () => ({
							code: `${namespace}-extend`,
							stringProperty: 'some string',
							someFloat: 20.21,
							enumProperty: 'First',
						}),
					},
				},
				documentStore: {
					get: async (type, code) => ({
						body: { documentProperty: `document for ${code}` },
					}),
				},
			});

			updateGraphqlApiOnSchemaChange();
			testApp.post('/graphql', graphqlHandler);
		});

		it('returns data from extended resolver', async () => {
			await createNode('SimpleGraphBranch', {
				code: mainCode,
			});
			return request(testApp)
				.post('/graphql')
				.send({
					query: `{
					SimpleGraphBranch(filter: {code: "${mainCode}"}) {
						code
						extended {
							code
							stringProperty
							someFloat
							enumProperty
						}
					}}`,
				})
				.expect(200, {
					data: {
						SimpleGraphBranch: {
							code: mainCode,
							extended: {
								code: `${namespace}-extend`,
								stringProperty: 'some string',
								someFloat: 20.21,
								enumProperty: 'First',
							},
						},
					},
				});
		});

		it('Extended Resolver and document can co-exist on same type', async () => {
			await createNode('SimpleGraphBranch', {
				code: mainCode,
			});
			return request(testApp)
				.post('/graphql')
				.send({
					query: `{
					SimpleGraphBranch(filter: {code: "${mainCode}"}) {
						code
						documentProperty
						extended {
							stringProperty
						}
					}}`,
				})
				.expect(200, {
					data: {
						SimpleGraphBranch: {
							code: mainCode,
							documentProperty: `document for ${mainCode}`,
							extended: {
								stringProperty: 'some string',
							},
						},
					},
				});
		});
	});
});
