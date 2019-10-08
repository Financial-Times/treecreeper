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
	const childCode = `${namespace}-child`;
	const parentCode = `${namespace}-parent`;
	const restrictedCode = `${namespace}-restricted`;

	const { createNodes, createNode, connectNodes, meta } = setupMocks(
		namespace,
	);

	securityTests(postHandler(), mainCode);

	const getInput = body => ({
		type: 'MainType',
		code: mainCode,
		body,
	});

	const getS3PostMock = body =>
		jest.fn(async () => ({
			versionId: 'fake-id',
			newBodyDocs: body,
		}));

	describe('writing disconnected records', () => {
		it('creates record with properties', async () => {
			const { status, body } = postHandler()(
				getInput({ someString: 'some string' }),
			);

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
			const { status, body } = postHandler()(getInput());

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
			const { status, body } = postHandler()(
				getInput({ someString: '' }),
			);

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
			const { status, body } = postHandler()(
				getInput({ someDate: new Date(date).toISOString() }),
			);

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
			const { status, body } = postHandler()(
				getInput({ someDatetime: datetime }),
			);

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
			const { status, body } = postHandler()(
				getInput({ someTime: time }),
			);

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
			await expect(postHandler()(getInput())).rejects.toThrow({
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
			await expect(
				postHandler()(getInput({ code: 'wrong-code' })),
			).rejects.toThrow({
				status: 400,
				message: `Conflicting code property \`wrong-code\` in payload for MainType ${mainCode}`,
			});
			await neo4jTest('MainType', mainCode).notExists();
		});
		it('throws 400 if attempting to write property not in schema', async () => {
			await expect(
				postHandler()(getInput({ notInSchema: 'a string' })),
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
			await expect(postHandler()(getInput)).rejects.toThrow('oh no');
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

	describe.skip('creating relationships', () => {
		it('creates record related to existing records', async () => {});
		it('throws 400 when creating record related to non-existent records', async () => {});
		it('creates record related to non-existent records when using upsert=true', async () => {});
	});

	describe.skip('restricted types', () => {
		it('throws 400 when creating restricted record', async () => {});
		it('creates restricted record when using correct client-id', async () => {});
	});

	describe.skip('field locking', () => {
		it('creates a record with _lockedFields', async () => {});
		it('creates a record with multiple fields, locking selective ones', async () => {});
		it('creates a record and locks all fields that are written', async () => {});
		it('throws 400 when clientId is not set', async () => {});
	});
});
