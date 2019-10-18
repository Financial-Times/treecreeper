const { getHandler, deleteHandler, postHandler, patchHandler } = require('..');
const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { docstore } = require('../../api-s3-document-store');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');

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

	const documentStore = docstore();

	const createResolvedDocstoreMock = (method, resolved) =>
		jest.spyOn(documentStore, method).mockResolvedValue(resolved);

	const createRejectedDocstoreMock = (method, rejected) =>
		jest.spyOn(documentStore, method).mockRejectedValue(rejected);

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('GET', () => {
		it('gets record with Documents', async () => {
			await createMainNode();
			const mockGet = createResolvedDocstoreMock('get', {
				body: { someDocument: 'document' },
			});

			const { body, status } = await getHandler({ documentStore })(input);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someDocument: 'document',
			});
			expect(mockGet).toHaveBeenCalledWith('MainType', mainCode);
		});

		it('throws if s3 query fails', async () => {
			const mockGet = createRejectedDocstoreMock(
				'get',
				new Error('oh no'),
			);
			await expect(getHandler({ documentStore })(input)).rejects.toThrow(
				'oh no',
			);
			expect(mockGet).toHaveBeenCalledWith('MainType', mainCode);
		});
	});

	describe('DELETE', () => {
		it('deletes record with Documents', async () => {
			await createMainNode();
			const versionMarker = 'delete-marker';
			const mockDelete = createResolvedDocstoreMock('delete', {
				versionMarker,
			});

			const { status } = await deleteHandler({ documentStore })(input);

			expect(status).toBe(204);
			await neo4jTest('MainType', mainCode).notExists();
			expect(mockDelete).toHaveBeenCalledWith('MainType', mainCode);
		});

		it('throws if s3 query fails', async () => {
			await createMainNode();
			const mockDelete = createResolvedDocstoreMock('delete', {
				versionMarker: null,
			});
			await expect(
				deleteHandler({ documentStore })(input),
			).rejects.toThrow(Error);
			await neo4jTest('MainType', mainCode).exists();
			expect(mockDelete).toHaveBeenCalledWith('MainType', mainCode);
		});

		it('undoes any s3 actions if neo4j query fails', async () => {
			const versionMarker = 'delete-marker';
			await createMainNode();

			const mockUndo = jest.fn(async () => ({}));
			const mockDelete = createResolvedDocstoreMock('delete', {
				versionMarker,
				undo: mockUndo,
			});
			dbUnavailable({ skip: 1 });
			await expect(
				deleteHandler({ documentStore })(input),
			).rejects.toThrow('oh no');
			expect(mockDelete).toHaveBeenCalledWith('MainType', mainCode);
			expect(mockUndo).toHaveBeenCalled();
		});
	});

	[['POST', postHandler, 200], ['PATCH', patchHandler, 201]].forEach(
		([method, handler, goodStatus]) => {
			describe(`${method} create`, () => {
				const versionMarker = 'post-marker';

				it('creates record with Documents', async () => {
					const mockPost = createResolvedDocstoreMock('post', {
						versionMarker,
						body: {
							someDocument: 'some document from s3',
						},
					});

					const { status, body } = await handler({ documentStore })(
						getInput({
							someString: 'some string',
							someDocument: 'some document',
						}),
					);

					expect(status).toBe(goodStatus);
					expect(body).toMatchObject({
						code: mainCode,
						someString: 'some string',
						someDocument: 'some document from s3',
					});

					await neo4jTest('MainType', mainCode)
						.exists()
						.match({
							code: mainCode,
							someString: 'some string',
						});

					expect(mockPost).toHaveBeenCalledWith(
						'MainType',
						mainCode,
						{
							someDocument: 'some document',
						},
					);
				});

				it("doesn't set a Document property when empty string provided", async () => {
					const mockPost = createResolvedDocstoreMock('post', {});
					const { status, body } = await handler({ documentStore })(
						getInput({
							someDocument: '',
						}),
					);

					expect(status).toBe(goodStatus);
					expect(body).toMatchObject({
						code: mainCode,
					});
					await neo4jTest('MainType', mainCode).exists();

					expect(mockPost).not.toHaveBeenCalled();
				});

				if (method === 'POST') {
					it('undoes any s3 actions if record already exists', async () => {
						await createNode('MainType', {
							code: mainCode,
						});
						await neo4jTest('MainType', mainCode).exists();
						const mockUndo = jest.fn(async () => ({}));
						const mockPost = createResolvedDocstoreMock('post', {
							undo: mockUndo,
						});

						await expect(
							handler({ documentStore })(
								getInput({
									someDocument: 'some document',
								}),
							),
						).rejects.toThrow({
							status: 409,
							message: `MainType ${mainCode} already exists`,
						});
						expect(mockPost).toHaveBeenCalledWith(
							'MainType',
							mainCode,
							{
								someDocument: 'some document',
							},
						);
						expect(mockUndo).toHaveBeenCalled();
					});
				}

				it('throws if s3 query fails', async () => {
					const mockPost = createRejectedDocstoreMock(
						'post',
						new Error('oh no'),
					);
					await expect(
						handler({ documentStore })(
							getInput({ someDocument: 'some document' }),
						),
					).rejects.toThrow('oh no');
					expect(mockPost).toHaveBeenCalled();
				});

				it('undoes any s3 actions if neo4j query fails', async () => {
					const mockUndo = jest.fn(async () => ({}));
					const mockPost = createResolvedDocstoreMock('post', {
						versionMarker,
						undo: mockUndo,
					});
					dbUnavailable({ skip: method === 'PATCH' ? 1 : 0 });

					await expect(
						handler({ documentStore })(
							getInput({ someDocument: 'some document' }),
						),
					).rejects.toThrow('oh no');
					expect(mockPost).toHaveBeenCalledWith(
						'MainType',
						mainCode,
						{
							someDocument: 'some document',
						},
					);
					expect(mockUndo).toHaveBeenCalled();
				});
			});
		},
	);

	describe('PATCH update', () => {
		const versionMarker = 'patch-marker';

		it('updates record with Documents', async () => {
			await createMainNode();
			const mockPatch = createResolvedDocstoreMock('patch', {
				versionMarker,
				body: {
					someDocument: 'some document from s3',
				},
			});
			const { status, body } = await patchHandler({ documentStore })(
				getInput({
					someString: 'some string',
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someString: 'some string',
				someDocument: 'some document from s3',
			});

			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someString: 'some string',
				});

			expect(mockPatch).toHaveBeenCalledWith('MainType', mainCode, {
				someDocument: 'some document',
			});
		});

		it('unsets a Document property when empty string provided', async () => {
			await createMainNode();
			const mockPatch = createResolvedDocstoreMock('patch', {
				versionMarker,
				body: {
					anotherDocument: 'another document from s3',
				},
			});
			const { status, body } = await patchHandler({ documentStore })(
				getInput({
					someDocument: '',
					anotherDocument: 'another document',
				}),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				anotherDocument: 'another document from s3',
			});

			await neo4jTest('MainType', mainCode).exists();

			expect(mockPatch).toHaveBeenCalledWith('MainType', mainCode, {
				anotherDocument: 'another document',
			});
		});

		it('throws if s3 query fails', async () => {
			await createMainNode();
			const mockPatch = createRejectedDocstoreMock(
				'patch',
				new Error('oh no'),
			);
			await expect(
				patchHandler({ documentStore })(
					getInput({ someDocument: 'some document' }),
				),
			).rejects.toThrow('oh no');
			expect(mockPatch).toHaveBeenCalled();
		});

		it('undoes any s3 actions if neo4j query fails', async () => {
			const mockUndo = jest.fn(async () => ({}));
			const mockPatch = createResolvedDocstoreMock('patch', {
				versionMarker,
				undo: mockUndo,
				body: {
					someDocument: 'some document from s3',
				},
			});
			await createMainNode();
			dbUnavailable({ skip: 1 });

			await expect(
				patchHandler({ documentStore })(
					getInput({ someDocument: 'some document' }),
				),
			).rejects.toThrow('oh no');
			expect(mockPatch).toHaveBeenCalledWith('MainType', mainCode, {
				someDocument: 'some document',
			});
			expect(mockUndo).toHaveBeenCalled();
		});
	});
});
