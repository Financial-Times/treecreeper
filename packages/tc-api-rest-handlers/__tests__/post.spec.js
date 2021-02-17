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

	const getInput = (type, body, query, metadata) => ({
		type,
		code: mainCode,
		body,
		query,
		metadata,
	});

	const postKitchenSinkPayload = body => postHandler({
		type: 'KitchenSink',
		code: mainCode,
		body
	});

	describe('writing disconnected records', () => {



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

			const { status, body } = await  postKitchenSinkPayload({
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
			const { status, body } = await postKitchenSinkPayload( { timeProperty: time });

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
				postKitchenSinkPayload({ firstStringProperty: 'some string' })
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
			await expect(
				postKitchenSinkPayload(),
			).rejects.toThrow('oh no');
		});
	});

	describe('creating relationships', () => {
		const basicHandler = (...args) =>
			postHandler(getInput('MainType', ...args));

		const childCode = `${namespace}-child`;
		const parentCode = `${namespace}-parent`;
		const parentCode2 = `${parentCode}-2`;

		it('creates record related to existing records', async () => {
			await createNodes(
				['ChildType', childCode],
				['ParentType', parentCode],
			);
			const { status, body } = await basicHandler(
				{
					children: [childCode],
					parents: [parentCode],
				},
				undefined,
				getMetaPayload(),
			);
			expect(status).toBe(200);
			expect(body).toMatchObject({
				children: [childCode],
				parents: [parentCode],
			});

			await neo4jTest('MainType', mainCode)
				.match(meta.create)
				.notMatch({
					children: [childCode],
					parents: [parentCode],
				})
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...meta.default },
					},
				)
				.hasRel(
					{
						type: 'IS_PARENT_OF',
						direction: 'incoming',
						props: meta.create,
					},
					{
						type: 'ParentType',
						props: {
							code: parentCode,
							...meta.default,
						},
					},
				);
		});

		it('throws 400 when creating record related to non-existent records', async () => {
			await expect(
				basicHandler({
					children: [childCode],
					parents: [parentCode],
				}),
			).rejects.httpError({
				status: 400,
				message: /Missing related node/,
			});
			await neo4jTest('MainType', mainCode).notExists();
		});

		it('creates record related to non-existent records when using upsert=true', async () => {
			const { status, body } = await basicHandler(
				{
					children: [childCode],
					parents: [parentCode],
				},
				{ upsert: true },
				getMetaPayload(),
			);
			expect(status).toBe(200);
			expect(body).toMatchObject({
				children: [childCode],
				parents: [parentCode],
			});

			await neo4jTest('MainType', mainCode)
				.match(meta.create)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...meta.create },
					},
				)
				.hasRel(
					{
						type: 'IS_PARENT_OF',
						direction: 'incoming',
						props: meta.create,
					},
					{
						type: 'ParentType',
						props: { code: parentCode, ...meta.create },
					},
				);
		});

		it('creates record with empty relationships array', async () => {
			const { status, body } = await basicHandler(
				{
					children: [],
				},
				getMetaPayload(),
			);

			expect(status).toBe(200);
			expect(body).not.toMatchObject({
				children: expect.any(Array),
			});

			await neo4jTest('MainType', mainCode).noRels();
		});

		describe('rich relationship information', () => {
			const firstStringProperty = 'some string';
			const secondStringProperty = 'another string';
			const booleanProperty = true;
			const enumProperty = 'First';
			const multipleChoiceEnumProperty = ['First', 'Second'];
			const childRelationshipProps = {
				code: childCode,
				firstStringProperty,
			};
			const childRelationshipTwoProps = {
				code: childCode,
				firstStringProperty,
				secondStringProperty,
			};
			const parentRelationshipProps = {
				code: parentCode,
				firstStringProperty,
			};
			const parent2RelationshipProps = {
				code: parentCode2,
				secondStringProperty,
			};

			it('returns record with rich relationship information if richRelationships query is true', async () => {
				const { status, body } = await basicHandler(
					{ children: [childCode], parents: [parentCode] },
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					children: [{ code: childCode, ...meta.create }],
					parents: [{ code: parentCode, ...meta.create }],
				});
			});

			it('creates record with relationship which has properties (one child one prop)', async () => {
				const { status, body } = await basicHandler(
					{ curiousChild: [childRelationshipProps] },
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: { ...childRelationshipProps, ...meta.create },
				});

				await neo4jTest('MainType', mainCode)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: { firstStringProperty, ...meta.create },
						},
						{
							type: 'ChildType',
							props: { code: childCode, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has properties (one child two props)', async () => {
				const { status, body } = await basicHandler(
					{ curiousChild: [childRelationshipTwoProps] },
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: {
						...childRelationshipTwoProps,
						...meta.create,
					},
				});

				await neo4jTest('MainType', mainCode)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: {
								firstStringProperty,
								secondStringProperty,
								...meta.create,
							},
						},
						{
							type: 'ChildType',
							props: { code: childCode, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has properties (two parents)', async () => {
				const { status, body } = await basicHandler(
					{
						curiousParent: [
							parentRelationshipProps,
							parent2RelationshipProps,
						],
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousParent: [
						{ ...parentRelationshipProps, ...meta.create },
						{ ...parent2RelationshipProps, ...meta.create },
					],
				});

				await neo4jTest('MainType', mainCode)
					.match(meta.create)
					.hasRels(2)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: { firstStringProperty, ...meta.create },
						},
						{
							type: 'ParentType',
							props: { code: parentCode, ...meta.create },
						},
					)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: { secondStringProperty, ...meta.create },
						},
						{
							type: 'ParentType',
							props: { code: parentCode2, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has properties (child and parent)', async () => {
				const { status, body } = await basicHandler(
					{
						curiousChild: [childRelationshipProps],
						curiousParent: [parentRelationshipProps],
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				// curiousChild's hasMany value is false, curiousParent's hasMany value is true
				// Therefore in body, curiousParent is in an Array and curiousChild is not.
				expect(body).toMatchObject({
					curiousChild: { ...childRelationshipProps, ...meta.create },
					curiousParent: [
						{
							...parentRelationshipProps,
							...meta.create,
						},
					],
				});

				await neo4jTest('MainType', mainCode)
					.match(meta.create)
					.hasRels(2)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: { firstStringProperty, ...meta.create },
						},
						{
							type: 'ChildType',
							props: { code: childCode, ...meta.create },
						},
					)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: { firstStringProperty, ...meta.create },
						},
						{
							type: 'ParentType',
							props: { code: parentCode, ...meta.create },
						},
					);
			});

			it('creates record with relationships which has a property and also no property', async () => {
				const { status, body } = await basicHandler(
					{
						curiousChild: [childRelationshipProps],
						curiousParent: [parentCode],
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				// curiousChild's hasMany value is false, curiousParent's hasMany value is true
				// Therefore in body, curiousParent is in an Array and curiousChild is not.
				expect(body).toMatchObject({
					curiousChild: { ...childRelationshipProps, ...meta.create },
					curiousParent: [{ code: parentCode, ...meta.create }],
				});

				await neo4jTest('MainType', mainCode)
					.match(meta.create)
					.hasRels(2)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: { firstStringProperty, ...meta.create },
						},
						{
							type: 'ChildType',
							props: { code: childCode, ...meta.create },
						},
					)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: { ...meta.create },
						},
						{
							type: 'ParentType',
							props: { code: parentCode, ...meta.create },
						},
					);
			});

			it('creates record with relationships which have same properties with different values (two parents)', async () => {
				const parentOneRelationshipProps = {
					code: parentCode,
					firstStringProperty: 'parent one some string',
					secondStringProperty: 'Parent one another string',
				};
				const parentTwoRelationshipProps = {
					code: parentCode2,
					firstStringProperty,
					secondStringProperty,
				};

				const { status, body } = await basicHandler(
					{
						curiousParent: [
							parentOneRelationshipProps,
							parentTwoRelationshipProps,
						],
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousParent: [
						{ ...parentOneRelationshipProps, ...meta.create },
						{ ...parentTwoRelationshipProps, ...meta.create },
					],
				});

				await neo4jTest('MainType', mainCode)
					.match(meta.create)
					.hasRels(2)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: {
								firstStringProperty:
									parentOneRelationshipProps.firstStringProperty,
								secondStringProperty:
									parentOneRelationshipProps.secondStringProperty,
								...meta.create,
							},
						},
						{
							type: 'ParentType',
							props: { code: parentCode, ...meta.create },
						},
					)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: {
								firstStringProperty,
								secondStringProperty,
								...meta.create,
							},
						},
						{
							type: 'ParentType',
							props: { code: parentCode2, ...meta.create },
						},
					);
			});

			it('creates record with relationships which have same properties with different values (child and parent)', async () => {
				const parentRelProps = {
					code: parentCode,
					firstStringProperty: 'Parent some string',
					secondStringProperty: 'Parent another string',
				};
				const childRelProps = {
					code: childCode,
					firstStringProperty,
					secondStringProperty,
					multipleChoiceEnumProperty,
					enumProperty,
					booleanProperty,
				};

				const { status, body } = await basicHandler(
					{
						curiousChild: [childRelProps],
						curiousParent: [parentRelProps],
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				// curiousChild's hasMany value is false, curiousParent's hasMany value is true
				// Therefore in body, curiousParent is in an Array and curiousChild is not.
				expect(body).toMatchObject({
					curiousChild: { ...childRelProps, ...meta.create },
					curiousParent: [{ ...parentRelProps, ...meta.create }],
				});

				await neo4jTest('MainType', mainCode)
					.match(meta.create)
					.hasRels(2)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: {
								firstStringProperty:
									childRelProps.firstStringProperty,
								secondStringProperty: childRelProps.secondStringProperty,
								multipleChoiceEnumProperty,
								enumProperty,
								booleanProperty,
								...meta.create,
							},
						},
						{
							type: 'ChildType',
							props: { code: childCode, ...meta.create },
						},
					)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: {
								firstStringProperty:
									parentRelProps.firstStringProperty,
								secondStringProperty: parentRelProps.secondStringProperty,
								...meta.create,
							},
						},
						{
							type: 'ParentType',
							props: { code: parentCode, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has a multiple choice property', async () => {
				const { status, body } = await basicHandler(
					{
						curiousChild: {
							code: childCode,
							multipleChoiceEnumProperty,
						},
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: {
						code: childCode,
						multipleChoiceEnumProperty,
						...meta.create,
					},
				});

				await neo4jTest('MainType', mainCode)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: {
								multipleChoiceEnumProperty,
								...meta.create,
							},
						},
						{
							type: 'ChildType',
							props: { code: childCode, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has an enum property', async () => {
				const { status, body } = await basicHandler(
					{
						curiousChild: { code: childCode, enumProperty },
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: {
						code: childCode,
						enumProperty,
						...meta.create,
					},
				});

				await neo4jTest('MainType', mainCode)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: {
								enumProperty,
								...meta.create,
							},
						},
						{
							type: 'ChildType',
							props: { code: childCode, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has a boolean property', async () => {
				const { status, body } = await basicHandler(
					{
						curiousChild: { code: childCode, booleanProperty },
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);
				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: {
						code: childCode,
						booleanProperty,
						...meta.create,
					},
				});

				await neo4jTest('MainType', mainCode)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: {
								booleanProperty,
								...meta.create,
							},
						},
						{
							type: 'ChildType',
							props: { code: childCode, ...meta.create },
						},
					);
			});

			it('throws 400 if attempting to write relationship property not in schema', async () => {
				await expect(
					basicHandler(
						{
							curiousChild: [
								{
									code: childCode,
									notInSchema: 'a string',
								},
							],
						},
						{ upsert: true, richRelationships: true },
						getMetaPayload(),
					),
				).rejects.httpError({
					status: 400,
					message:
						'Invalid property `notInSchema` on type `CuriousChild`.',
				});

				await neo4jTest('MainType', mainCode).notExists();
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
		const basicHandler = (...args) =>
			postHandler(getInput('KitchenSink', ...args));
		const lockClient = `${namespace}-lock-client`;

		it('creates a record with _lockedFields', async () => {
			const { status, body } = await postHandler({
				type: 'KitchenSink',
				code: mainCode,
				body: { firstStringProperty: 'some string' },
				query: { lockFields: 'firstStringProperty' },
				metadata: {
					clientId: lockClient,
				}
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
				}
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
				}
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
				basicHandler(
					{ firstStringProperty: 'some string' },
					{ lockFields: 'all' },
				),
			).rejects.httpError({
				status: 400,
				message: /clientId needs to be set to a valid system code in order to lock fields/,
			});
			await neo4jTest('KitchenSink', mainCode).notExists();
		});
	});
});
