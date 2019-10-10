const { patchHandler } = require('../patch');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest PATCH create', () => {
	const namespace = 'api-rest-handlers-patch-create';
	const mainCode = `${namespace}-main`;

	const { createNodes, createNode, meta, getMetaPayload } = setupMocks(
		namespace,
	);

	securityTests(patchHandler(), mainCode);

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

	const basicHandler = (...args) => patchHandler()(getInput(...args));

	describe('writing disconnected records', () => {
		it('creates record with no body', async () => {
			const { status, body } = await basicHandler();

			expect(status).toBe(201);
			expect(body).toMatchObject({
				code: mainCode,
			});
			await neo4jTest('MainType', mainCode).exists();
		});

		it('creates record with properties', async () => {
			const { status, body } = await basicHandler({
				someString: 'some string',
			});

			expect(status).toBe(201);
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
			const { status, body } = await basicHandler(
				undefined,
				undefined,
				getMetaPayload(),
			);

			expect(status).toBe(201);
			expect(body).toMatchObject(meta.create);
			await neo4jTest('MainType', mainCode)
				.exists()
				.match(meta.create);
		});

		it.skip('creates record with Documents', async () => {
			const s3PostMock = getS3PostMock({ someDocument: 'some document' });
			const { status, body } = await patchHandler({
				documentStore: {
					post: s3PostMock,
				},
			})(
				getInput({
					someString: 'some string',
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(201);
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
			const { status, body } = await basicHandler({ someString: '' });

			expect(status).toBe(201);
			expect(body).toMatchObject({
				code: mainCode,
			});

			await neo4jTest('MainType', mainCode)
				.exists()
				.notMatch({
					someString: expect.any(String),
				});
		});
		it.skip("doesn't set a Document property when empty string provided", async () => {
			const s3PostMock = getS3PostMock({ someDocument: '' });
			const { status, body } = await patchHandler({
				documentStore: {
					post: s3PostMock,
				},
			})(
				getInput({
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(201);
			expect(body).toMatchObject({
				code: mainCode,
			});
			await neo4jTest('MainType', mainCode).exists();

			expect(s3PostMock).not.toHaveBeenCalled();
		});

		it('sets Date property', async () => {
			const date = '2019-01-09';
			const { status, body } = await basicHandler({
				someDate: new Date(date).toISOString(),
			});

			expect(status).toBe(201);
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
			const { status, body } = await basicHandler({
				someDatetime: datetime,
			});

			expect(status).toBe(201);
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

		it.skip('sets Time property', async () => {
			const time = '2019-01-09T00:00:00.000Z';
			const { status, body } = await basicHandler({ someTime: time });

			expect(status).toBe(201);
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

		it.skip("doesn't write to s3 if record already exists", async () => {
			await createNode('MainType', {
				code: mainCode,
			});
			const s3PostMock = getS3PostMock();
			await expect(
				patchHandler({
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

		it.skip('throws if s3 query fails', async () => {
			await expect(
				patchHandler({
					documentStore: {
						post: asyncErrorFunction,
					},
				})(getInput({ someDocument: 'some document' })),
			).rejects.toThrow('oh no');
		});

		it.skip('undoes any s3 actions if neo4j query fails', async () => {
			const s3PostMock = jest.fn(async () => 'post-marker');
			dbUnavailable();
			await expect(
				patchHandler({
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

	describe('restricted types', () => {
		const restrictedCode = `${namespace}-restricted`;

		it('throws 400 when creating restricted record', async () => {
			await expect(
				patchHandler()({
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
			const { status } = await patchHandler()({
				type: 'RestrictedType',
				code: restrictedCode,
				metadata: {
					clientId: 'restricted-type-creator',
				},
			});

			expect(status).toBe(201);
			await neo4jTest('RestrictedType', restrictedCode).exists();
		});
	});
});
