const { postHandler } = require('..');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest POST', () => {
	const namespace = 'api-rest-post-handler';
	const mainCode = `${namespace}-main`;

	const { createNodes, createNode, connectNodes, meta } = setupMocks(
		namespace,
	);

	securityTests(postHandler(), mainCode);

	const getInput = (body, query, metadata) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const getS3PostMock = body =>
		jest.fn(async () => ({
			versionId: 'fake-id',
			newBodyDocs: body,
		}));

	const basicHandler = (...args) => postHandler()(getInput(...args));

	describe('writing disconnected records', () => {
		it('creates record with properties', async () => {
			const { status, body } = basicHandler({
				someString: 'some string',
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someString: 'some string',
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someString: 'some string',
				})
				.noRels();
		});

		it('sets metadata', async () => {
			const { status, body } = basicHandler();

			expect(status).toBe(200);
			expect(body).toMatchObject(meta.create);
			await neo4jTest('MainType', mainCode)
				.exists()
				.match(meta.create);
		});

		it('creates record with Documents', async () => {
			const s3PostMock = getS3PostMock({ someDocument: 'some document' });
			const { status, body } = await postHandler({
				documentStore: {
					post: s3PostMock,
				},
			})(
				getInput({
					someString: 'some string',
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someString: 'some string',
				someDocument: 'some document',
			});

			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someString: 'some string',
				});

			expect(s3PostMock).toHaveBeenCalledWith({
				someDocument: 'some document',
			});
		});
		it("doesn't set a property when empty string provided", async () => {
			const { status, body } = basicHandler({ someString: '' });

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
			});

			await neo4jTest('MainType', mainCode)
				.exists()
				.notMatch({
					someString: expect.any(),
				});
		});
		it("doesn't set a Document property when empty string provided", async () => {
			const s3PostMock = getS3PostMock({ someDocument: '' });
			const { status, body } = await postHandler({
				documentStore: {
					post: s3PostMock,
				},
			})(
				getInput({
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
			});
			await neo4jTest('MainType', mainCode).exists();

			expect(s3PostMock).not.toHaveBeenCalled();
		});

		it('sets Date property', async () => {
			const date = '2019-01-09';
			const { status, body } = basicHandler({
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

		it('sets Datetime property', async () => {
			const datetime = '2019-01-09T00:00:00.000Z';
			const { status, body } = basicHandler({ someDatetime: datetime });

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someDatetime: datetime,
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someDatetime: datetime,
				});
		});

		it('sets Time property', async () => {
			const time = '2019-01-09T00:00:00.000Z';
			const { status, body } = basicHandler({ someTime: time });

			expect(status).toBe(200);
			expect(body).toMatchObject({
				someTime: time,
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someTime: time,
				})
				.noRels();
		});

		it('throws 409 error if record already exists', async () => {
			await createNode('MainType', {
				code: mainCode,
			});
			await expect(basicHandler()).rejects.toThrow({
				status: 409,
			});
			await neo4jTest('MainType', mainCode).notExists();
		});

		it("doesn't write to s3 if record already exists", async () => {
			await createNode('MainType', {
				code: mainCode,
			});
			const s3PostMock = getS3PostMock();
			await expect(
				postHandler({
					documentStore: {
						post: s3PostMock,
					},
				})(
					getInput({
						someDocument: 'some document',
					}),
				),
			).rejects.toThrow({
				status: 409,
				message: `MainType ${mainCode} already exists`,
			});

			await neo4jTest('MainType', mainCode).notExists();
			expect(s3PostMock).not.toHaveBeenCalled();
		});

		it('throws 400 if code in body conflicts with code in url', async () => {
			await expect(basicHandler({ code: 'wrong-code' })).rejects.toThrow({
				status: 400,
				message: `Conflicting code property \`wrong-code\` in payload for MainType ${mainCode}`,
			});
			await neo4jTest('MainType', mainCode).notExists();
		});

		it('throws 400 if attempting to write property not in schema', async () => {
			await expect(
				basicHandler({ notInSchema: 'a string' }),
			).rejects.toThrow({
				status: 400,
				message: 'Invalid property `notInSchema` on type `MainType`',
			});
			await neo4jTest('MainType', mainCode).notExists();
		});
	});

	describe('generic error states', () => {
		it('throws if neo4j query fails', async () => {
			dbUnavailable();
			await expect(basicHandler()).rejects.toThrow('oh no');
		});

		it('throws if s3 query fails', async () => {
			await expect(
				postHandler({
					documentStore: {
						post: asyncErrorFunction,
					},
				})(getInput({ someDocument: 'some document' })),
			).rejects.toThrow('oh no');
		});

		it('undoes any s3 actions if neo4j query fails', async () => {
			const s3PostMock = jest.fn(async () => 'post-marker');
			dbUnavailable();
			await expect(
				postHandler({
					documentStore: {
						post: s3PostMock,
					},
				})(getInput({ someDocument: 'some document' })),
			).rejects.toThrow('oh no');
			expect(s3PostMock).toHaveBeenCalledWith(
				'MainType',
				mainCode,
				'post-marker',
			);
		});
	});

	describe('creating relationships', () => {
		const childCode = `${namespace}-child`;
		const parentCode = `${namespace}-parent`;

		it('creates record related to existing records', async () => {
			await createNodes(
				['ChildType', childCode],
				['ParentType', parentCode],
			);
			const { status, body } = await basicHandler({
				children: [childCode],
				parents: [parentCode],
			});
			expect(status).toBe(200);
			expect(body).toMatchObject({
				children: [childCode],
				parents: [parentCode],
			});

			await neo4jTest('MainType', mainCode)
				.match(meta.create)
				.hasRels(2)
				.hasRel([
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'ChildType',
						props: Object.assign({ code: childCode }, meta.default),
					},
				])
				.hasRel([
					{
						type: 'IS_PARENT_OF',
						direction: 'incoming',
						props: meta.create,
					},
					{
						type: 'ParentType',
						props: Object.assign(
							{ code: parentCode },
							meta.default,
						),
					},
				]);
		});

		it('throws 400 when creating record related to non-existent records', async () => {
			await expect(
				basicHandler({
					children: [childCode],
					parents: [parentCode],
				}),
			).rejects.toThrow({ status: 400, message: /Missing related node/ });
			await neo4jTest('MainType', mainCode).notExists();
		});

		it('creates record related to non-existent records when using upsert=true', async () => {
			const { status, body } = await basicHandler(
				{
					children: [childCode],
					parents: [parentCode],
				},
				{ upsert: true },
			);
			expect(status).toBe(200);
			expect(body).toMatchObject({
				children: [childCode],
				parents: [parentCode],
			});

			await neo4jTest('MainType', mainCode)
				.match(meta.create)
				.hasRels(2)
				.hasRel([
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'ChildType',
						props: Object.assign({ code: childCode }, meta.create),
					},
				])
				.hasRel([
					{
						type: 'IS_PARENT_OF',
						direction: 'incoming',
						props: meta.create,
					},
					{
						type: 'ParentType',
						props: Object.assign({ code: parentCode }, meta.create),
					},
				]);
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
			).rejects.toThrow({
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

			expect(status).ToBe(200);
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

			expect(status).ToBe(200);
			expect(body).toMatchObject({
				someString: 'some string',
				_lockedFields: `{"someString":${lockClient}}`,
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					someString: 'some string',
					_lockedFields: `{"someString":${lockClient}}`,
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

			expect(status).ToBe(200);
			expect(body).toMatchObject({
				someString: 'some string',
				anotherString: 'another string',
				_lockedFields: `{"someString":${lockClient}}`,
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					someString: 'some string',
					anotherString: 'another string',
					_lockedFields: `{"someString":${lockClient}}`,
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

			expect(status).ToBe(200);
			expect(body).toMatchObject({
				someString: 'some string',
				_lockedFields: `{"someString":${lockClient}}`,
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					someString: 'some string',
					_lockedFields: `{"someString":${lockClient}}`,
				});
		});

		it('throws 400 when clientId is not set', async () => {
			await expect(
				basicHandler(
					{ someString: 'some string' },
					{ lockFields: 'all' },
				),
			).rejects.toThrow({
				status: 400,
				message: /clientId needs to be set to a valid system code in order to lock fields/,
			});
			await neo4jTest('MainType', mainCode).notExists();
		});
	});
});
