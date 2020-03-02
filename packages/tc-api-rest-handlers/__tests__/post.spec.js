const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { postHandler } = require('../post');

describe('rest POST', () => {
	const namespace = 'api-rest-handlers-post';
	const mainCode = `${namespace}-main`;

	const { createNodes, createNode, meta, getMetaPayload } = setupMocks(
		namespace,
	);

	const getInput = (body, query, metadata) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const basicHandler = (...args) => postHandler()(getInput(...args));

	describe('writing disconnected records', () => {
		it('creates record with no body', async () => {
			const { status, body } = await basicHandler();

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
			});
			await neo4jTest('MainType', mainCode).exists();
		});

		it('creates record with properties', async () => {
			const { status, body } = await basicHandler({
				someString: 'some string',
				someBoolean: true,
				someEnum: 'First',
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someString: 'some string',
				someBoolean: true,
				someEnum: 'First',
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someString: 'some string',
					someBoolean: true,
					someEnum: 'First',
				})
				.noRels();
		});

		it('sets metadata', async () => {
			const { status, body } = await basicHandler(
				undefined,
				undefined,
				getMetaPayload(),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject(meta.create);
			await neo4jTest('MainType', mainCode)
				.exists()
				.match(meta.create);
		});

		it('sets array data', async () => {
			const { body, status } = await basicHandler({
				// someStringList: ['one', 'two'],
				someMultipleChoice: ['First', 'Second'],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				// someStringList: ['one', 'two'],
				someMultipleChoice: ['First', 'Second'],
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					// someStringList: ['one', 'two'],
					someMultipleChoice: ['First', 'Second'],
				});
		});

		it("doesn't set a property when empty string provided", async () => {
			const { status, body } = await basicHandler({ someString: '' });

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
			});

			await neo4jTest('MainType', mainCode)
				.exists()
				.notMatch({
					someString: expect.any(String),
				});
		});

		it('sets Date property', async () => {
			const date = '2019-01-09';
			const { status, body } = await basicHandler({
				someDate: new Date(date).toISOString(),
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someDate: date,
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someDate: date,
				});
		});
		const neo4jTimePrecision = timestamp =>
			timestamp.replace('Z', '000000Z');

		it('sets Datetime property', async () => {
			const datetime = '2019-01-09T00:00:00.001Z';

			const { status, body } = await basicHandler({
				someDatetime: datetime,
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				someDatetime: neo4jTimePrecision(datetime),
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someDatetime: neo4jTimePrecision(datetime),
				});
		});

		it('sets Time property', async () => {
			const time = '12:34:56.789Z';
			const { status, body } = await basicHandler({ someTime: time });

			expect(status).toBe(200);
			expect(body).toMatchObject({
				someTime: neo4jTimePrecision(time),
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someTime: neo4jTimePrecision(time),
				})
				.noRels();
		});

		it('throws 409 error if record already exists', async () => {
			await createNode('MainType', {
				code: mainCode,
			});
			await expect(
				basicHandler({ someString: 'some string' }),
			).rejects.httpError({
				status: 409,
				message: `MainType ${mainCode} already exists`,
			});
			await neo4jTest('MainType', mainCode).notMatch({
				someString: 'some string',
			});
		});

		it('throws 400 if code in body conflicts with code in url', async () => {
			await expect(
				basicHandler({ code: 'wrong-code' }),
			).rejects.httpError({
				status: 400,
				message: `Conflicting code property \`wrong-code\` in payload for MainType ${mainCode}`,
			});
			await neo4jTest('MainType', mainCode).notExists();
		});

		it('throws 400 if attempting to write property not in schema', async () => {
			await expect(
				basicHandler({ notInSchema: 'a string' }),
			).rejects.httpError({
				status: 400,
				message: 'Invalid property `notInSchema` on type `MainType`.',
			});
			await neo4jTest('MainType', mainCode).notExists();
		});
	});

	describe('generic error states', () => {
		it('throws if neo4j query fails', async () => {
			dbUnavailable();
			await expect(basicHandler()).rejects.toThrow('oh no');
		});
	});

	describe('creating relationships', () => {
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
			const someString = 'some string';
			const anotherString = 'another string';
			const someBoolean = true;
			const someEnum = 'First';
			const someMultipleChoice = ['First', 'Second'];
			const childRelationshipProps = { code: childCode, someString };
			const childRelationshipTwoProps = {
				code: childCode,
				someString,
				anotherString,
			};
			const parentRelationshipProps = { code: parentCode, someString };
			const parent2RelationshipProps = {
				code: parentCode2,
				anotherString,
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
							props: { someString, ...meta.create },
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
								someString,
								anotherString,
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
							props: { someString, ...meta.create },
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
							props: { anotherString, ...meta.create },
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
							props: { someString, ...meta.create },
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
							props: { someString, ...meta.create },
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
							props: { someString, ...meta.create },
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

			it('creates record with relationship which has a multiple choice property', async () => {
				const { status, body } = await basicHandler(
					{
						curiousChild: { code: childCode, someMultipleChoice },
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: {
						code: childCode,
						someMultipleChoice,
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
								someMultipleChoice,
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
						curiousChild: { code: childCode, someEnum },
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: {
						code: childCode,
						someEnum,
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
								someEnum,
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
						curiousChild: { code: childCode, someBoolean },
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);
				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: {
						code: childCode,
						someBoolean,
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
								someBoolean,
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
				postHandler()({
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
			const { status } = await postHandler()({
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
			const { status, body } = await basicHandler(
				{ someString: 'some string' },
				{ lockFields: 'someString' },
				{
					clientId: lockClient,
				},
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				someString: 'some string',
				_lockedFields: `{"someString":"${lockClient}"}`,
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					someString: 'some string',
					_lockedFields: `{"someString":"${lockClient}"}`,
				});
		});

		it('creates a record with multiple fields, locking selective ones', async () => {
			const { status, body } = await basicHandler(
				{
					someString: 'some string',
					anotherString: 'another string',
				},
				{ lockFields: 'someString' },
				{
					clientId: lockClient,
				},
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				someString: 'some string',
				anotherString: 'another string',
				_lockedFields: `{"someString":"${lockClient}"}`,
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					someString: 'some string',
					anotherString: 'another string',
					_lockedFields: `{"someString":"${lockClient}"}`,
				});
		});

		it('creates a record and locks all fields that are written', async () => {
			const { status, body } = await basicHandler(
				{ someString: 'some string' },
				{ lockFields: 'all' },
				{
					clientId: lockClient,
				},
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				someString: 'some string',
				_lockedFields: `{"someString":"${lockClient}"}`,
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					someString: 'some string',
					_lockedFields: `{"someString":"${lockClient}"}`,
				});
		});

		it('throws 400 when clientId is not set', async () => {
			await expect(
				basicHandler(
					{ someString: 'some string' },
					{ lockFields: 'all' },
				),
			).rejects.httpError({
				status: 400,
				message: /clientId needs to be set to a valid system code in order to lock fields/,
			});
			await neo4jTest('MainType', mainCode).notExists();
		});
	});
});
