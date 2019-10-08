const { postHandler } = require('..');

const {
	setupMocks,
	verifyNotExists,
	verifyExists,
	testNode,
} = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest POST', () => {
	const sandbox = {};
	const namespace = 'api-rest-post-handler';
	const mainCode = `${namespace}-main`;
	const childCode = `${namespace}-child`;
	const parentCode = `${namespace}-parent`;
	const restrictedCode = `${namespace}-restricted`;

	setupMocks(sandbox, { namespace });

	securityTests(postHandler(), mainCode);

	const getInput = body => ({
		type: 'MainType',
		code: mainCode,
		body,
	});

	const getS3PostMock = body =>
		jest.fn(async () => ({
			versionId,
			newBodyDocs: body,
		}));

	describe('writing properties', () => {
		it('creates record with properties', async () => {
			const { status, body } = postHandler()(
				getInput({ someString: 'some string' }),
			);

			expect(status).toBe(200);
			expect(body).toEqual(
				sandbox.withCreateMeta({
					code: mainCode,
					someString: 'some string',
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withCreateMeta({
					code: mainCode,
					someString: 'some string',
				}),
			);
		});
		it('creates record with Documents', async () => {
			const postMock = getS3PostMock({ someDocument: 'some document' });
			const { status, body } = await postHandler({
				documentStore: {
					post: postMock,
				},
			})(
				getInput({
					someString: 'some string',
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(body).toEqual(
				sandbox.withCreateMeta({
					code: mainCode,
					someString: 'some string',
					someDocument: 'some document',
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withCreateMeta({
					code: mainCode,
					someString: 'some string',
				}),
			);

			expect(postMock).toHaveBeenCalledWith({
				someDocument: 'some document',
			});
		});
		it("doesn't set a property when empty string provided", async () => {
			const { status, body } = postHandler()(
				getInput({ someString: '' }),
			);

			expect(status).toBe(200);
			expect(body).toEqual(
				sandbox.withCreateMeta({
					code: mainCode,
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withCreateMeta({
					code: mainCode,
				}),
			);
		});
		it("doesn't set a Document property when empty string provided", async () => {
			const postMock = getS3PostMock({ someDocument: '' });
			const { status, body } = await postHandler({
				documentStore: {
					post: postMock,
				},
			})(
				getInput({
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(body).toEqual(
				sandbox.withCreateMeta({
					code: mainCode,
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withCreateMeta({
					code: mainCode,
				}),
			);

			expect(postMock).not.toHaveBeenCalled();
		});
		it('sets Date property', async () => {
			const date = '2019-01-09';
			const { status, body } = postHandler()(
				getInput({ someDate: new Date(date).toISOString() }),
			);

			expect(status).toBe(200);
			expect(body).toEqual(
				sandbox.withCreateMeta({
					code: mainCode,
					someDate: date,
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withCreateMeta({
					code: mainCode,
					someDate: date,
				}),
			);
		});
		it('sets Datetime property', async () => {
			const datetime = '2019-01-09T00:00:00.000Z';
			const { status, body } = postHandler()(
				getInput({ someDatetime: datetime }),
			);

			expect(status).toBe(200);
			expect(body).toEqual(
				sandbox.withCreateMeta({
					code: mainCode,
					someDatetime: datetime,
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withCreateMeta({
					code: mainCode,
					someDatetime: datetime,
				}),
			);
		});

		it('sets Time property', async () => {
			const time = '2019-01-09T00:00:00.000Z';
			const { status, body } = postHandler()(
				getInput({ someTime: time }),
			);

			expect(status).toBe(200);
			expect(body).toEqual(
				sandbox.withCreateMeta({
					someTime: time,
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withCreateMeta({
					someTime: time,
				}),
			);
		});
	});

	describe('generic error states', () => {
		it('throws 409 error if record already exists', async () => {});
		it('throws 400 if code in body conflicts with code in url', async () => {});
		it('throws 400 if attempting to write property not in schema', async () => {});
		it('throws if neo4j query fails', async () => {
			dbUnavailable();
			await expect(postHandler()(getInput)).rejects.toThrow('oh no');
		});

		it('throws if s3 query fails', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
			});
			await expect(
				postHandler({
					documentStore: {
						post: asyncErrorFunction,
					},
				})(getInput({ someDocument: 'some document' })),
			).rejects.toThrow('oh no');
		});

		it('undoes any s3 actions if neo4j query fails', async () => {
			const postMock = jest.fn(async () => 'post-marker');
			await sandbox.createNode('MainType', {
				code: mainCode,
			});
			dbUnavailable({ skip: 1 });
			await expect(
				postHandler({
					documentStore: {
						post: postMock,
					},
				})(getInput({ someDocument: 'some document' })),
			).rejects.toThrow('oh no');
			expect(postMock).toHaveBeenCalledWith(
				'MainType',
				mainCode,
				'post-marker',
			);
		});
	});
	describe('restricted types', () => {
		it('throws 400 when creating restricted record', async () => {});
		it('creates restricted record when using correct client-id', async () => {});
	});

	describe('creating relationships', () => {
		it('creates record related to existing records', async () => {});
		it('throws 400 when creating record related to non-existent records', async () => {});
		it('creates record related to non-existent records when using upsert=true', async () => {});
	});
	describe('field locking', () => {
		it('creates a record with _lockedFields', async () => {});
		it('creates a record with multiple fields, locking selective ones', async () => {});
		it('creates a record and locks all fields that are written', async () => {});
		it('throws 400 when clientId is not set', async () => {});
	});
});
