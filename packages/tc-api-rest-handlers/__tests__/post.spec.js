const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { postHandler: postHandlerFactory } = require('../post');

const postHandler = postHandlerFactory();

describe('rest POST', () => {
	const namespace = 'api-rest-handlers-post';
	const branchCode = `${namespace}-branch`;

	const { createNodes, createNode, meta, getMetaPayload } = setupMocks(
		namespace,
	);

	describe('writing disconnected records', () => {
		const postKitchenSinkPayload = body =>
			postHandler({
				type: 'KitchenSink',
				code: branchCode,
				body,
			});

		it('creates record with no body', async () => {
			const { status, body } = await postKitchenSinkPayload();

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: branchCode,
			});
			await neo4jTest('KitchenSink', branchCode).exists();
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
				code: branchCode,
				...payload,
			});
			await neo4jTest('KitchenSink', branchCode)
				.exists()
				.match({
					code: branchCode,
					...payload,
				})
				.noRels();
		});

		it('sets metadata', async () => {
			const { status, body } = await postHandler({
				type: 'KitchenSink',
				code: branchCode,
				metadata: getMetaPayload(),
			});

			expect(status).toBe(200);
			expect(body).toMatchObject(meta.create);
			await neo4jTest('KitchenSink', branchCode)
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
			await neo4jTest('KitchenSink', branchCode).exists().match(payload);
		});

		it("doesn't set a property when empty string provided", async () => {
			const payload = { firstStringProperty: '' };
			const { status, body } = await postKitchenSinkPayload(payload);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: branchCode,
			});

			await neo4jTest('KitchenSink', branchCode)
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
				code: branchCode,
				dateProperty: date,
			});
			await neo4jTest('KitchenSink', branchCode).exists().match({
				code: branchCode,
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
			await neo4jTest('KitchenSink', branchCode)
				.exists()
				.match({
					code: branchCode,
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
			await neo4jTest('KitchenSink', branchCode)
				.exists()
				.match({
					code: branchCode,
					timeProperty: neo4jTimePrecision(time),
				})
				.noRels();
		});

		it('throws 409 error if record already exists', async () => {
			await createNode('KitchenSink', {
				code: branchCode,
			});
			await expect(
				postKitchenSinkPayload({ firstStringProperty: 'some string' }),
			).rejects.httpError({
				status: 409,
				message: `KitchenSink ${branchCode} already exists`,
			});
			await neo4jTest('KitchenSink', branchCode).notMatch({
				firstStringProperty: 'some string',
			});
		});

		it('throws 400 if code in body conflicts with code in url', async () => {
			await expect(
				postKitchenSinkPayload({ code: 'wrong-code' }),
			).rejects.httpError({
				status: 400,
				message: `Conflicting code property \`wrong-code\` in payload for KitchenSink ${branchCode}`,
			});
			await neo4jTest('KitchenSink', branchCode).notExists();
		});

		it('throws 400 if attempting to write property not in schema', async () => {
			await expect(
				postKitchenSinkPayload({ notInSchema: 'a string' }),
			).rejects.httpError({
				status: 400,
				message:
					'Invalid property `notInSchema` on type `KitchenSink`.',
			});
			await neo4jTest('KitchenSink', branchCode).notExists();
		});

		it('throws if neo4j query fails', async () => {
			dbUnavailable();
			await expect(postKitchenSinkPayload()).rejects.toThrow('oh no');
		});
	});

	describe('creating relationships', () => {
		const leafCode1 = `${namespace}-leaf-1`;
		const leafCode2 = `${namespace}-leaf-2`;

		const postSimpleGraphBranch = (body, query) =>
			postHandler({
				type: 'SimpleGraphBranch',
				code: branchCode,
				body,
				query,
				metadata: getMetaPayload(),
			});

		it('creates record related to existing records', async () => {
			await createNodes(
				['SimpleGraphLeaf', leafCode1],
				['SimpleGraphBranch', branchCode],
			);
			const { status, body } = await postSimpleGraphBranch({
				leaves: [leafCode1],
				parent: branchCode,
			});
			expect(status).toBe(200);
			expect(body).toMatchObject({
				leaves: [leafCode1],
				parent: branchCode,
			});

			await neo4jTest('SimpleGraphBranch', branchCode)
				.match(meta.create)
				.notMatch({
					leaves: [leafCode1],
					parent: branchCode,
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
						props: { code: leafCode1, ...meta.default },
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
							code: branchCode,
							...meta.default,
						},
					},
				);
		});

		it('throws 400 when creating record related to non-existent records', async () => {
			await expect(
				postSimpleGraphBranch({
					leaves: [leafCode1],
					parent: branchCode,
				}),
			).rejects.httpError({
				status: 400,
				message: /Missing related node/,
			});
			await neo4jTest('SimpleGraphBranch', branchCode).notExists();
		});

		it('creates record related to non-existent records when using upsert=true', async () => {
			const { status, body } = await postSimpleGraphBranch(
				{
					leaves: [leafCode1],
					parent: branchCode,
				},
				{ upsert: true },
			);
			expect(status).toBe(200);
			expect(body).toMatchObject({
				leaves: [leafCode1],
				parent: branchCode,
			});

			await neo4jTest('SimpleGraphBranch', branchCode)
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
						props: { code: leafCode1, ...meta.create },
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
						props: { code: branchCode, ...meta.create },
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

			await neo4jTest('SimpleGraphBranch', branchCode).noRels();
		});

		it('returns record with rich relationship information if richRelationships query is true', async () => {
			const { status, body } = await postSimpleGraphBranch(
				{ leaves: [leafCode1], parent: branchCode },
				{ upsert: true, richRelationships: true },
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				leaves: [{ code: leafCode1, ...meta.create }],
				parent: { code: branchCode, ...meta.create },
			});
		});

		describe('rich relationships', () => {
			it('creates record with rich relationship to another record', async () => {
				const relationshipDef = {
					stringProperty: 'some string',
					booleanProperty: true,
				};
				const { status, body } = await postHandler({
					type: 'SimpleGraphLeaf',
					code: leafCode1,
					body: {
						formerBranch: { code: branchCode, ...relationshipDef },
					},
					query: { upsert: true, richRelationships: true },
					metadata: getMetaPayload(),
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					formerBranch: {
						code: branchCode,
						...relationshipDef,
						...meta.create,
					},
				});

				await neo4jTest('SimpleGraphLeaf', leafCode1)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAD_LEAF',
							direction: 'incoming',
							props: {
								...relationshipDef,
								...meta.create,
							},
						},
						{
							type: 'SimpleGraphBranch',
							props: { code: branchCode, ...meta.create },
						},
					);
			});

			it('creates record with rich relationships to other records', async () => {
				const relationshipDef1 = {
					stringProperty: 'some string1',
					booleanProperty: true,
				};
				const relationshipDef2 = {
					stringProperty: 'some string2',
					booleanProperty: false,
				};
				const { status, body } = await postHandler({
					type: 'SimpleGraphBranch',
					code: branchCode,
					body: {
						fallenLeaves: [
							{ code: leafCode1, ...relationshipDef1 },
							{ code: leafCode2, ...relationshipDef2 },
						],
					},
					query: { upsert: true, richRelationships: true },
					metadata: getMetaPayload(),
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					fallenLeaves: [
						{
							code: leafCode1,
							...relationshipDef1,
							...meta.create,
						},
						{
							code: leafCode2,
							...relationshipDef2,
							...meta.create,
						},
					],
				});

				await neo4jTest('SimpleGraphBranch', branchCode)
					.match(meta.create)
					.hasRels(2)
					.hasRel(
						{
							type: 'HAD_LEAF',
							direction: 'outgoing',
							props: { ...relationshipDef1, ...meta.create },
						},
						{
							type: 'SimpleGraphLeaf',
							props: { code: leafCode1, ...meta.create },
						},
					)
					.hasRel(
						{
							type: 'HAD_LEAF',
							direction: 'outgoing',
							props: { ...relationshipDef2, ...meta.create },
						},
						{
							type: 'SimpleGraphLeaf',
							props: { code: leafCode2, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has a multiple choice property', async () => {
				const relationshipDef = {
					multipleChoiceEnumProperty: ['First', 'Second'],
				};
				const { status, body } = await postHandler({
					type: 'SimpleGraphBranch',
					code: branchCode,
					body: {
						fallenLeaves: [{ code: leafCode1, ...relationshipDef }],
					},
					query: { upsert: true, richRelationships: true },
					metadata: getMetaPayload(),
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					fallenLeaves: [{ code: leafCode1, ...relationshipDef }],
				});

				await neo4jTest('SimpleGraphBranch', branchCode)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAD_LEAF',
							direction: 'outgoing',
							props: { ...relationshipDef, ...meta.create },
						},
						{
							type: 'SimpleGraphLeaf',
							props: { code: leafCode1, ...meta.create },
						},
					);
			});

			it('throws 400 if attempting to write relationship property not in schema', async () => {
				await expect(
					postHandler({
						type: 'SimpleGraphBranch',
						code: branchCode,
						body: {
							fallenLeaves: [
								{ code: leafCode1, notInSchema: 'no' },
							],
						},
						query: { upsert: true, richRelationships: true },
						metadata: getMetaPayload(),
					}),
				).rejects.httpError({
					status: 400,
					message:
						'Invalid property `notInSchema` on type `FallenLeaf`.',
				});

				await neo4jTest('SimpleGraphBranch', branchCode).notExists();
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
				code: branchCode,
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
			await neo4jTest('KitchenSink', branchCode)
				.exists()
				.match({
					firstStringProperty: 'some string',
					_lockedFields: `{"firstStringProperty":"${lockClient}"}`,
				});
		});

		it('creates a record with multiple fields, locking selective ones', async () => {
			const { status, body } = await postHandler({
				type: 'KitchenSink',
				code: branchCode,
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
			await neo4jTest('KitchenSink', branchCode)
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
				code: branchCode,
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
			await neo4jTest('KitchenSink', branchCode)
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
					code: branchCode,
					body: {
						firstStringProperty: 'some string',
					},
					query: { lockFields: 'all' },
				}),
			).rejects.httpError({
				status: 400,
				message: /clientId needs to be set to a valid system code in order to lock fields/,
			});
			await neo4jTest('KitchenSink', branchCode).notExists();
		});
	});
});
