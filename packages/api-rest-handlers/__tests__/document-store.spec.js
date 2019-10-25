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

	const stringInput = {
		someString: 'some string',
	};

	const documentInput = {
		someDocument: 'some document',
	};

	const getInput = body => {
		return Object.assign({}, input, { body });
	};

	const { createNode } = setupMocks(namespace);

	const documentStore = docstore();
	const documentFromS3 = { someDocument: 'some document from s3' };

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
			const mockDocstoreGet = createResolvedDocstoreMock('get', {
				body: documentFromS3,
			});

			const { body, status } = await getHandler({ documentStore })(input);

			expect(status).toBe(200);
			expect(body).toMatchObject(
				Object.assign({ code: mainCode }, documentFromS3),
			);
			expect(mockDocstoreGet).toHaveBeenCalledWith('MainType', mainCode);
		});

		it('throws if s3 query fails', async () => {
			const mockDocstoreGet = createRejectedDocstoreMock(
				'get',
				new Error('oh no'),
			);
			await expect(getHandler({ documentStore })(input)).rejects.toThrow(
				'oh no',
			);
			expect(mockDocstoreGet).toHaveBeenCalledWith('MainType', mainCode);
		});

		it('returns document from neo4j when documentStore is not passed in', async () => {
			await createMainNode(documentInput);
			const mockDocstoreGet = createResolvedDocstoreMock('get', {
				body: documentFromS3,
			});

			const { body, status } = await getHandler({})(input);

			expect(status).toBe(200);
			expect(body).toMatchObject(
				Object.assign({ code: mainCode }, documentInput),
			);
			expect(mockDocstoreGet).not.toHaveBeenCalled();
		});
	});

	describe('DELETE', () => {
		it('deletes record with Documents', async () => {
			await createMainNode();
			const versionMarker = 'delete-marker';
			const mockDocstoreDelete = createResolvedDocstoreMock('delete', {
				versionMarker,
			});

			const { status } = await deleteHandler({ documentStore })(input);

			expect(status).toBe(204);
			await neo4jTest('MainType', mainCode).notExists();
			expect(mockDocstoreDelete).toHaveBeenCalledWith(
				'MainType',
				mainCode,
			);
		});

		it('deletes record when documentStore is not passed in', async () => {
			await createMainNode(documentInput);

			const { status } = await deleteHandler({})(input);

			expect(status).toBe(204);
			await neo4jTest('MainType', mainCode).notExists();
		});

		it('throws if s3 query fails', async () => {
			await createMainNode();
			const mockDocstoreDelete = createResolvedDocstoreMock('delete', {
				versionMarker: null,
			});
			await expect(
				deleteHandler({ documentStore })(input),
			).rejects.toThrow(Error);
			await neo4jTest('MainType', mainCode).exists();
			expect(mockDocstoreDelete).toHaveBeenCalledWith(
				'MainType',
				mainCode,
			);
		});

		it('undoes any s3 actions if neo4j query fails', async () => {
			const versionMarker = 'delete-marker';
			await createMainNode();

			const mockUndo = jest.fn(async () => ({}));
			const mockDocstoreDelete = createResolvedDocstoreMock('delete', {
				versionMarker,
				undo: mockUndo,
			});
			dbUnavailable({ skip: 1 });
			await expect(
				deleteHandler({ documentStore })(input),
			).rejects.toThrow('oh no');
			expect(mockDocstoreDelete).toHaveBeenCalledWith(
				'MainType',
				mainCode,
			);
			expect(mockUndo).toHaveBeenCalled();
		});
	});

	[['POST', postHandler, 200], ['PATCH', patchHandler, 201]].forEach(
		([method, handler, goodStatus]) => {
			describe(`${method} create`, () => {
				const versionMarker = 'post-marker';

				it('creates record with Documents', async () => {
					const mockDocstorePost = createResolvedDocstoreMock(
						'post',
						{
							versionMarker,
							body: documentFromS3,
						},
					);

					const { status, body } = await handler({ documentStore })(
						getInput(Object.assign({}, stringInput, documentInput)),
					);

					expect(status).toBe(goodStatus);
					expect(body).toMatchObject(
						Object.assign(
							{ code: mainCode },
							stringInput,
							documentFromS3,
						),
					);

					await neo4jTest('MainType', mainCode)
						.exists()
						.match(Object.assign({ code: mainCode }, stringInput));

					expect(mockDocstorePost).toHaveBeenCalledWith(
						'MainType',
						mainCode,
						documentInput,
					);
				});

				it("doesn't set a Document property when empty string provided", async () => {
					const mockDocstorePost = createResolvedDocstoreMock(
						'post',
						{},
					);
					const { status, body } = await handler({ documentStore })(
						getInput({ someDocument: '' }),
					);

					expect(status).toBe(goodStatus);
					expect(body).toMatchObject({
						code: mainCode,
					});
					await neo4jTest('MainType', mainCode).exists();

					expect(mockDocstorePost).not.toHaveBeenCalled();
				});

				if (method === 'POST') {
					it('undoes any s3 actions if record already exists', async () => {
						await createNode('MainType', {
							code: mainCode,
						});
						await neo4jTest('MainType', mainCode).exists();
						const mockUndo = jest.fn(async () => ({}));
						const mockDocstorePost = createResolvedDocstoreMock(
							'post',
							{
								undo: mockUndo,
							},
						);

						await expect(
							handler({ documentStore })(getInput(documentInput)),
						).rejects.toThrow({
							status: 409,
							message: `MainType ${mainCode} already exists`,
						});
						expect(mockDocstorePost).toHaveBeenCalledWith(
							'MainType',
							mainCode,
							documentInput,
						);
						expect(mockUndo).toHaveBeenCalled();
					});
				}

				it('throws if s3 query fails', async () => {
					const mockDocstorePost = createRejectedDocstoreMock(
						'post',
						new Error('oh no'),
					);
					await expect(
						handler({ documentStore })(getInput(documentInput)),
					).rejects.toThrow('oh no');
					expect(mockDocstorePost).toHaveBeenCalled();
				});

				it('undoes any s3 actions if neo4j query fails', async () => {
					const mockUndo = jest.fn(async () => ({}));
					const mockDocstorePost = createResolvedDocstoreMock(
						'post',
						{
							versionMarker,
							undo: mockUndo,
						},
					);
					dbUnavailable({ skip: method === 'PATCH' ? 1 : 0 });

					await expect(
						handler({ documentStore })(getInput(documentInput)),
					).rejects.toThrow('oh no');
					expect(mockDocstorePost).toHaveBeenCalledWith(
						'MainType',
						mainCode,
						documentInput,
					);
					expect(mockUndo).toHaveBeenCalled();
				});

				it('returns document from neo4j when documentStore is not passed in', async () => {
					const mockDocstorePost = createResolvedDocstoreMock(
						'post',
						{
							versionMarker,
							body: documentFromS3,
						},
					);

					const { status, body } = await handler({})(
						getInput(Object.assign({}, stringInput, documentInput)),
					);

					expect(status).toBe(goodStatus);
					expect(body).toMatchObject(
						Object.assign(
							{ code: mainCode },
							stringInput,
							documentInput,
						),
					);

					await neo4jTest('MainType', mainCode)
						.exists()
						.match(Object.assign({ code: mainCode }, stringInput));

					expect(mockDocstorePost).not.toHaveBeenCalled();
				});
			});
		},
	);

	describe('PATCH update', () => {
		const versionMarker = 'patch-marker';

		it('updates record with Documents', async () => {
			await createMainNode();
			const mockDocstorePatch = createResolvedDocstoreMock('patch', {
				versionMarker,
				body: documentFromS3,
			});
			const { status, body } = await patchHandler({ documentStore })(
				getInput(Object.assign({}, stringInput, documentInput)),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject(
				Object.assign({ code: mainCode }, stringInput, documentFromS3),
			);

			await neo4jTest('MainType', mainCode)
				.exists()
				.match(Object.assign({ code: mainCode }, stringInput));

			expect(mockDocstorePatch).toHaveBeenCalledWith(
				'MainType',
				mainCode,
				documentInput,
			);
		});

		it('unsets a Document property when empty string provided', async () => {
			await createMainNode();
			const anotherDocFromS3 = {
				anotherDocument: 'another document from s3',
			};
			const mockDocstorePatch = createResolvedDocstoreMock('patch', {
				versionMarker,
				body: anotherDocFromS3,
			});
			const { status, body } = await patchHandler({ documentStore })(
				getInput({
					someDocument: '',
					anotherDocument: 'another document',
				}),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject(
				Object.assign({ code: mainCode }, anotherDocFromS3),
			);

			await neo4jTest('MainType', mainCode).exists();

			expect(mockDocstorePatch).toHaveBeenCalledWith(
				'MainType',
				mainCode,
				{
					anotherDocument: 'another document',
				},
			);
		});

		it('throws if s3 query fails', async () => {
			await createMainNode();
			const mockDocstorePatch = createRejectedDocstoreMock(
				'patch',
				new Error('oh no'),
			);
			await expect(
				patchHandler({ documentStore })(getInput(documentInput)),
			).rejects.toThrow('oh no');
			expect(mockDocstorePatch).toHaveBeenCalled();
		});

		it('undoes any s3 actions if neo4j query fails', async () => {
			const mockUndo = jest.fn(async () => ({}));
			const mockDocstorePatch = createResolvedDocstoreMock('patch', {
				versionMarker,
				undo: mockUndo,
				body: documentFromS3,
			});
			await createMainNode();
			dbUnavailable({ skip: 1 });

			await expect(
				patchHandler({ documentStore })(getInput(documentInput)),
			).rejects.toThrow('oh no');
			expect(mockDocstorePatch).toHaveBeenCalledWith(
				'MainType',
				mainCode,
				documentInput,
			);
			expect(mockUndo).toHaveBeenCalled();
		});

		it('returns document from neo4j when documentStore is not passed in', async () => {
			await createMainNode();
			const mockDocstorePatch = createResolvedDocstoreMock('patch', {
				versionMarker,
				body: documentFromS3,
			});
			const { status, body } = await patchHandler({})(
				getInput(Object.assign({}, stringInput, documentInput)),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject(
				Object.assign({ code: mainCode }, stringInput, documentInput),
			);

			await neo4jTest('MainType', mainCode)
				.exists()
				.match(Object.assign({ code: mainCode }, stringInput));

			expect(mockDocstorePatch).not.toHaveBeenCalled();
		});
	});

	describe.skip('absorb', () => {
		it('responds with 500 if s3 query fails', async () => {
			// stubS3Unavailable(sandbox);
			// await testMergeRequest(
			// 	{
			// 		type: 'MainType',
			// 		sourceCode: mainCode1,
			// 		destinationCode: mainCode2,
			// 	},
			// 	500,
			// );
			// await Promise.all([
			// 	verifyExists('MainType', mainCode1),
			// 	verifyExists('MainType', mainCode2),
			// ]);
			// expect(stubSendEvent).not.toHaveBeenCalled();
			// expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});

		it('merges document properties', async () => {
			// await createNodes(
			// 	[
			// 		'MainType',
			// 		{
			// 			code: mainCode,
			// 			someString: 'Fake Document',
			// 			anotherDocument: 'Another Fake Document',
			// 		},
			// 	],
			// 	[
			// 		'MainType',
			// 		{
			// 			code: mainCode2,
			// 			anotherDocument: 'A Third Fake Document',
			// 		},
			// 	],
			// );
			// await testMergeRequest(
			// 	{
			// 		type: 'MainType',
			// 		sourceCode: mainCode,
			// 		destinationCode: mainCode2,
			// 	},
			// 	200,
			// 	withUpdateMeta({
			// 		code: mainCode2,
			// 		someString: 'Fake Document',
			// 		anotherDocument: 'A Third Fake Document',
			// 	}),
			// );
		});

		it('merges neo4j document properties when documentStore is not passed in', async () => {
			// need a test
		});
	});
});
