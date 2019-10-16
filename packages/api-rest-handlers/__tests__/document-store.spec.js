const { getHandler, deleteHandler, postHandler, patchHandler } = require('..');
const { setupMocks, neo4jTest } = require('../../../test-helpers');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest document store integration', () => {
	const namespace = 'api-rest-handlers-docstore';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'MainType',
		code: mainCode,
	};

	const getInput = body => ({
		type: 'MainType',
		code: mainCode,
		body,
	});

	const { createNode } = setupMocks(namespace);

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	describe('GET', () => {
		it('gets record with Documents', async () => {
			await createMainNode();

			const { body, status } = await getHandler({
				documentStore: {
					get: jest.fn(async () => ({
						someDocument: 'document',
					})),
				},
			})(input);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someDocument: 'document',
			});
		});

		it('throws if s3 query fails', async () => {
			await expect(
				getHandler({
					documentStore: {
						get: asyncErrorFunction,
					},
				})(input),
			).rejects.toThrow('oh no');
		});
	});

	describe('DELETE', () => {
		it('deletes record with Documents', async () => {
			const deleteMock = jest.fn(async () => 'delete-marker');
			await createMainNode();

			const { status } = await deleteHandler({
				documentStore: {
					delete: deleteMock,
				},
			})(input);

			expect(status).toBe(204);
			await neo4jTest('MainType', mainCode).notExists();
			expect(deleteMock).toHaveBeenCalledWith('MainType', mainCode);
		});

		it('throws if s3 query fails', async () => {
			await createMainNode();
			await expect(
				deleteHandler({
					documentStore: {
						delete: asyncErrorFunction,
					},
				})(input),
			).rejects.toThrow('oh no');
			await neo4jTest('MainType', mainCode).exists();
		});

		it('undoes any s3 actions if neo4j query fails', async () => {
			const deleteMock = jest.fn(async () => 'delete-marker');
			await createMainNode();
			dbUnavailable({ skip: 1 });
			await expect(
				deleteHandler({
					documentStore: {
						delete: deleteMock,
					},
				})(input),
			).rejects.toThrow('oh no');
			expect(deleteMock).toHaveBeenCalledWith(
				'MainType',
				mainCode,
				'delete-marker',
			);
		});
	});

	[
		['POST', postHandler, 200],
		// ['PATCH', patchHandler, 201]
	].forEach(([method, handler, goodStatus]) => {
		describe(`${method} create`, () => {
			const getS3PostMock = () =>
				jest.fn(async () => ({
					versionId: 'fake-id',
					newBodyDocs: {
						someDocument: 'some document from s3 mock',
					},
				}));

			it('creates record with Documents', async () => {
				const s3PostMock = getS3PostMock({
					someDocument: 'some document',
				});
				const { status, body } = await handler({
					documentStore: {
						post: s3PostMock,
					},
				})(
					getInput({
						someString: 'some string',
						someDocument: 'some document',
					}),
				);

				expect(status).toBe(goodStatus);
				expect(body).toMatchObject({
					code: mainCode,
					someString: 'some string',
					someDocument: 'some document from s3 mock',
				});

				await neo4jTest('MainType', mainCode)
					.exists()
					.match({
						code: mainCode,
						someString: 'some string',
					});

				expect(s3PostMock).toHaveBeenCalledWith('MainType', mainCode, {
					someDocument: 'some document',
				});
			});

			it("doesn't set a Document property when empty string provided", async () => {
				const s3PostMock = getS3PostMock({});
				const { status, body } = await handler({
					documentStore: {
						post: s3PostMock,
					},
				})(
					getInput({
						someDocument: '',
					}),
				);

				expect(status).toBe(goodStatus);
				expect(body).toMatchObject({
					code: mainCode,
				});
				await neo4jTest('MainType', mainCode).exists();

				expect(s3PostMock).not.toHaveBeenCalled();
			});

			it("doesn't write to s3 if record already exists", async () => {
				await createNode('MainType', {
					code: mainCode,
				});
				const s3PostMock = getS3PostMock();
				await expect(
					handler({
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

			it('throws if s3 query fails', async () => {
				await expect(
					handler({
						documentStore: {
							post: asyncErrorFunction,
						},
					})(getInput({ someDocument: 'some document' })),
				).rejects.toThrow('oh no');
			});

			it('undoes any s3 actions if neo4j query fails', async () => {
				const s3PostMock = jest.fn(async () => 'post-marker');
				dbUnavailable({ skip: 1 });
				await expect(
					handler({
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
	});

	describe('PATCH update', () => {
		const getS3PatchMock = body =>
			jest.fn(async () => ({
				versionId: 'fake-id',
				newBodyDocs: body,
			}));

		it('updates record with Documents', async () => {
			await createMainNode();
			const s3PatchMock = getS3PatchMock({
				someDocument: 'some document',
			});
			const { status, body } = await patchHandler({
				documentStore: {
					patch: s3PatchMock,
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

			expect(s3PatchMock).toHaveBeenCalledWith({
				someDocument: 'some document',
			});
		});
		it('unsets a Document property when empty string provided', async () => {
			await createMainNode();
			const s3PatchMock = getS3PatchMock({
				anotherDocument: 'another document',
			});
			const { status, body } = await patchHandler({
				documentStore: {
					patch: s3PatchMock,
				},
			})(
				getInput({
					someDocument: '',
					anotherDocument: 'another document',
				}),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
			});
			await neo4jTest('MainType', mainCode).exists();

			expect(s3PatchMock).toHaveBeenCalledWith({
				anotherDocument: 'another document',
			});
		});
		it('throws if s3 query fails', async () => {
			await createMainNode();
			await expect(
				patchHandler({
					documentStore: {
						patch: asyncErrorFunction,
					},
				})(getInput({ someDocument: 'some document' })),
			).rejects.toThrow('oh no');
		});

		it('undoes any s3 actions if neo4j query fails', async () => {
			const s3PatchMock = jest.fn(async () => 'patch-marker');
			await createMainNode();
			dbUnavailable({ skip: 1 });
			await expect(
				patchHandler({
					documentStore: {
						patch: s3PatchMock,
					},
				})(getInput({ someDocument: 'some document' })),
			).rejects.toThrow('oh no');
			expect(s3PatchMock).toHaveBeenCalledWith(
				'MainType',
				mainCode,
				'patch-marker',
			);
		});
	});
});
