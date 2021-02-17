const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { postHandler: postHandlerFactory } = require('../post');

const postHandler = postHandlerFactory();

describe('rest POST', () => {
	const namespace = 'api-rest-handlers-post';
	const mainCode = `${namespace}-main`;

	const { createNodes, createNode, meta, getMetaPayload } = setupMocks(
		namespace,
	);

	describe('writing disconnected records', () => {
		const postKitchenSinkPayload = body =>
			postHandler({
				type: 'KitchenSink',
				code: mainCode,
				body,
			});

		it('creates record with no body', async () => {
			const { status, body } = await postKitchenSinkPayload();

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
			});
			await neo4jTest('KitchenSink', mainCode).exists();
		});

		it('creates record with properties', async () => {
			const payload = {
				firstStringProperty: 'some string',
				booleanProperty: true,
				enumProperty: 'First',
			};
			const { status, body } = await postKitchenSinkPayload(payload);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				...payload,
			});
			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.match({
					code: mainCode,
					...payload,
				})
				.noRels();
		});

		it('sets metadata', async () => {
			const { status, body } = await postHandler({
				type: 'KitchenSink',
				code: mainCode,
				metadata: getMetaPayload(),
			});

			expect(status).toBe(200);
			expect(body).toMatchObject(meta.create);
			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.match(meta.create);
		});

		it('sets array data', async () => {
			const payload = {
				// someStringList: ['one', 'two'],
				multipleChoiceEnumProperty: ['First', 'Second'],
			};
			const { body, status } = await postKitchenSinkPayload(payload);

			expect(status).toBe(200);
			expect(body).toMatchObject(payload);
			await neo4jTest('KitchenSink', mainCode).exists().match(payload);
		});

		it("doesn't set a property when empty string provided", async () => {
			const payload = { firstStringProperty: '' };
			const { status, body } = await postKitchenSinkPayload(payload);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
			});

			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.notMatch({
					firstStringProperty: expect.any(String),
				});
		});

		it('sets Date property', async () => {
			const date = '2019-01-09';
			const { status, body } = await postKitchenSinkPayload({
				dateProperty: new Date(date).toISOString(),
			});
			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				dateProperty: date,
			});
			await neo4jTest('KitchenSink', mainCode).exists().match({
				code: mainCode,
				dateProperty: date,
			});
		});
		const neo4jTimePrecision = timestamp =>
			timestamp.replace('Z', '000000Z');

		it('sets Datetime property', async () => {
			const datetime = '2019-01-09T00:00:00.001Z';

			const { status, body } = await postKitchenSinkPayload({
				datetimeProperty: datetime,
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				datetimeProperty: neo4jTimePrecision(datetime),
			});
			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.match({
					code: mainCode,
					datetimeProperty: neo4jTimePrecision(datetime),
				});
		});

		it('sets Time property', async () => {
			const time = '12:34:56.789Z';
			const { status, body } = await postKitchenSinkPayload({
				timeProperty: time,
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				timeProperty: neo4jTimePrecision(time),
			});
			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.match({
					code: mainCode,
					timeProperty: neo4jTimePrecision(time),
				})
				.noRels();
		});

		it('throws 409 error if record already exists', async () => {
			await createNode('KitchenSink', {
				code: mainCode,
			});
			await expect(
				postKitchenSinkPayload({ firstStringProperty: 'some string' }),
			).rejects.httpError({
				status: 409,
				message: `KitchenSink ${mainCode} already exists`,
			});
			await neo4jTest('KitchenSink', mainCode).notMatch({
				firstStringProperty: 'some string',
			});
		});

		it('throws 400 if code in body conflicts with code in url', async () => {
			await expect(
				postKitchenSinkPayload({ code: 'wrong-code' }),
			).rejects.httpError({
				status: 400,
				message: `Conflicting code property \`wrong-code\` in payload for KitchenSink ${mainCode}`,
			});
			await neo4jTest('KitchenSink', mainCode).notExists();
		});

		it('throws 400 if attempting to write property not in schema', async () => {
			await expect(
				postKitchenSinkPayload({ notInSchema: 'a string' }),
			).rejects.httpError({
				status: 400,
				message:
					'Invalid property `notInSchema` on type `KitchenSink`.',
			});
			await neo4jTest('KitchenSink', mainCode).notExists();
		});

		it('throws if neo4j query fails', async () => {
			dbUnavailable();
			await expect(postKitchenSinkPayload()).rejects.toThrow('oh no');
		});
	});

	describe('creating relationships', () => {
		const leafCode = `${namespace}-leaf`;
		const parentCode = `${namespace}-parent`;

		const postSimpleGraphBranch = (body, query) =>
			postHandler({
				type: 'SimpleGraphBranch',
				code: mainCode,
				body,
				query,
				metadata: getMetaPayload(),
			});

		it('creates record related to existing records', async () => {
			await createNodes(
				['SimpleGraphLeaf', leafCode],
				['SimpleGraphBranch', parentCode],
			);
			const { status, body } = await postSimpleGraphBranch({
				leaves: [leafCode],
				parent: parentCode,
			});
			expect(status).toBe(200);
			expect(body).toMatchObject({
				leaves: [leafCode],
				parent: parentCode,
			});

			await neo4jTest('SimpleGraphBranch', mainCode)
				.match(meta.create)
				.notMatch({
					leaves: [leafCode],
					parent: parentCode,
				})
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_LEAF',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'SimpleGraphLeaf',
						props: { code: leafCode, ...meta.default },
					},
				)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'incoming',
						props: meta.create,
					},
					{
						type: 'SimpleGraphBranch',
						props: {
							code: parentCode,
							...meta.default,
						},
					},
				);
		});

		it('throws 400 when creating record related to non-existent records', async () => {
			await expect(
				postSimpleGraphBranch({
					leaves: [leafCode],
					parent: parentCode,
				}),
			).rejects.httpError({
				status: 400,
				message: /Missing related node/,
			});
			await neo4jTest('SimpleGraphBranch', mainCode).notExists();
		});

		it('creates record related to non-existent records when using upsert=true', async () => {
			const { status, body } = await postSimpleGraphBranch(
				{
					leaves: [leafCode],
					parent: parentCode,
				},
				{ upsert: true },
			);
			expect(status).toBe(200);
			expect(body).toMatchObject({
				leaves: [leafCode],
				parent: parentCode,
			});

			await neo4jTest('SimpleGraphBranch', mainCode)
				.match(meta.create)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_LEAF',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'SimpleGraphLeaf',
						props: { code: leafCode, ...meta.create },
					},
				)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'incoming',
						props: meta.create,
					},
					{
						type: 'SimpleGraphBranch',
						props: { code: parentCode, ...meta.create },
					},
				);
		});

		it('creates record with empty relationships array', async () => {
			const { status, body } = await postSimpleGraphBranch({
				leaves: [],
			});

			expect(status).toBe(200);
			expect(body).not.toMatchObject({
				leaves: expect.any(Array),
			});

			await neo4jTest('SimpleGraphBranch', mainCode).noRels();
		});

		it('returns record with rich relationship information if richRelationships query is true', async () => {
			const { status, body } = await postSimpleGraphBranch(
				{ leaves: [leafCode], parent: parentCode },
				{ upsert: true, richRelationships: true },
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				leaves: [{ code: leafCode, ...meta.create }],
				parent: { code: parentCode, ...meta.create },
			});
		});
	});

	describe('restricted types', () => {
		const restrictedCode = `${namespace}-restricted`;

		it('throws 400 when creating restricted record', async () => {
			await expect(
				postHandler({
					type: 'RestrictedType',
					code: restrictedCode,
				}),
			).rejects.httpError({
				status: 400,
				message: `RestrictedTypes can only be created by restricted-type-creator`,
			});
			await neo4jTest('RestrictedType', restrictedCode).notExists();
		});

		it('creates restricted record when using correct client-id', async () => {
			const { status } = await postHandler({
				type: 'RestrictedType',
				code: restrictedCode,
				metadata: {
					clientId: 'restricted-type-creator',
				},
			});

			expect(status).toBe(200);
			await neo4jTest('RestrictedType', restrictedCode).exists();
		});
	});

	describe('field locking', () => {
		const lockClient = `${namespace}-lock-client`;

		it('creates a record with _lockedFields', async () => {
			const { status, body } = await postHandler({
				type: 'KitchenSink',
				code: mainCode,
				body: { firstStringProperty: 'some string' },
				query: { lockFields: 'firstStringProperty' },
				metadata: {
					clientId: lockClient,
				},
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				firstStringProperty: 'some string',
				_lockedFields: `{"firstStringProperty":"${lockClient}"}`,
			});
			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.match({
					firstStringProperty: 'some string',
					_lockedFields: `{"firstStringProperty":"${lockClient}"}`,
				});
		});

		it('creates a record with multiple fields, locking selective ones', async () => {
			const { status, body } = await postHandler({
				type: 'KitchenSink',
				code: mainCode,
				body: {
					firstStringProperty: 'some string',
					secondStringProperty: 'another string',
				},
				query: { lockFields: 'firstStringProperty' },
				metadata: {
					clientId: lockClient,
				},
			});
			expect(status).toBe(200);
			expect(body).toMatchObject({
				firstStringProperty: 'some string',
				secondStringProperty: 'another string',
				_lockedFields: `{"firstStringProperty":"${lockClient}"}`,
			});
			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.match({
					firstStringProperty: 'some string',
					secondStringProperty: 'another string',
					_lockedFields: `{"firstStringProperty":"${lockClient}"}`,
				});
		});

		it('creates a record and locks all fields that are written', async () => {
			const { status, body } = await postHandler({
				type: 'KitchenSink',
				code: mainCode,
				body: {
					firstStringProperty: 'some string',
				},
				query: { lockFields: 'all' },
				metadata: {
					clientId: lockClient,
				},
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				firstStringProperty: 'some string',
				_lockedFields: `{"firstStringProperty":"${lockClient}"}`,
			});
			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.match({
					firstStringProperty: 'some string',
					_lockedFields: `{"firstStringProperty":"${lockClient}"}`,
				});
		});

		it('throws 400 when clientId is not set', async () => {
			await expect(
				postHandler({
					type: 'KitchenSink',
					code: mainCode,
					body: {
						firstStringProperty: 'some string',
					},
					query: { lockFields: 'all' },
				}),
			).rejects.httpError({
				status: 400,
				message: /clientId needs to be set to a valid system code in order to lock fields/,
			});
			await neo4jTest('KitchenSink', mainCode).notExists();
		});
	});
});
