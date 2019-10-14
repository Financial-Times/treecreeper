const neo4jTemporalTypes = require('neo4j-driver/lib/v1/temporal-types');
const { patchHandler } = require('../patch');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest PATCH update', () => {
	const namespace = 'api-rest-handlers-patch-update';
	const mainCode = `${namespace}-main`;

	const { createNode, meta, getMetaPayload } = setupMocks(namespace);

	securityTests(patchHandler(), mainCode);

	const getInput = (body, query, metadata) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const getS3PatchMock = body =>
		jest.fn(async () => ({
			versionId: 'fake-id',
			newBodyDocs: body,
		}));

	const basicHandler = (...args) => patchHandler()(getInput(...args));

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	describe('updating disconnected records', () => {
		it('updates record with properties', async () => {
			await createMainNode({
				someString: 'some string',
				someBoolean: true,
				someEnum: 'First',
			});
			const { status, body } = await basicHandler({
				someString: 'updated string',
				anotherString: 'another string',
				someBoolean: false,
				someEnum: 'Second',
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someString: 'updated string',
				anotherString: 'another string',
				someBoolean: false,
				someEnum: 'Second',
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someString: 'updated string',
					anotherString: 'another string',
					someBoolean: false,
					someEnum: 'Second',
				})
				.noRels();
		});
		it('updates metadata', async () => {
			await createMainNode();
			const { status, body } = await basicHandler(
				undefined,
				undefined,
				getMetaPayload(),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject(meta.update);
			await neo4jTest('MainType', mainCode)
				.exists()
				.match(meta.update);
		});
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
		describe('temporal properties', () => {
			describe('Date', () => {
				it('sets Date when no previous value', async () => {
					await createMainNode();
					const date = '2019-01-09';
					const { status, body } = await basicHandler({
						someDate: new Date(date).toISatchring(),
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
				it('updates existing Date', async () => {
					await createMainNode({
						someDate: neo4jTemporalTypes.Date.fromStandardDate(
							new Date('2018-01-09'),
						),
					});
					const date = '2019-01-09';
					const { status, body } = await basicHandler({
						someDate: new Date(date).toISatchring(),
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
				it.skip("doesn't update when effectively the same Date", async () => {});
			});
			describe('Time', () => {
				it('sets Time when no previous value', async () => {
					await createMainNode();
					const time = '2019-01-09T00:00:00.000Z';
					const { status, body } = await basicHandler({
						someTime: time,
					});

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
				it('updates existing Time', async () => {
					await createMainNode({
						someTime: neo4jTemporalTypes.Time.fromStandardDate(
							new Date('2018-01-09'),
						),
					});
					const time = '2019-01-09T00:00:00.000Z';
					const { status, body } = await basicHandler({
						someTime: time,
					});

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
				it.skip("doesn't update when effectively the same Time", async () => {});
			});
			describe('Datetime', () => {
				it('sets Datetime when no previous value', async () => {
					await createMainNode();
					const datetime = '2019-01-09T00:00:00.000Z';
					const { status, body } = await basicHandler({
						someDatetime: datetime,
					});

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
				it('updates existing Datetime', async () => {
					await createMainNode({
						someDatetime: neo4jTemporalTypes.Time.fromStandardDate(
							new Date('2018-01-09'),
						),
					});
					const datetime = '2019-01-09T00:00:00.000Z';
					const { status, body } = await basicHandler({
						someDatetime: datetime,
					});

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
				it.skip("doesn't update when effectively the same Datetime", async () => {});
			});
		});

		it('unsets a property when empty string provided', async () => {
			await createMainNode({
				someString: 'some string',
			});
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
		it('not unset property when falsy value provided', async () => {
			await createMainNode('MainType', {
				someBoolean: true,
				someInteger: 1,
			});
			const { body } = await basicHandler({
				someBoolean: false,
				someInteger: 0,
			});
			expect(body).toMatchObject({
				someBoolean: false,
				someInteger: 0,
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					someBoolean: false,
					someInteger: 0,
				});
		});
		it('no clientId, deletes the _updatedByClient property', async () => {
			await createMainNode();
			const { body } = await basicHandler(undefined, undefined, {
				clientUserId: 'still-here',
			});
			expect(body).toMatchObject({
				clientUserId: 'still-here',
			});
			expect(body).not.toMatchObject({
				clientId: expect.any(String),
			});
		});
		it('no clientUserId, deletes the _updatedByUser property', async () => {
			await createMainNode();
			const { body } = await basicHandler(undefined, undefined, {
				clientId: 'still-here',
			});
			expect(body).toMatchObject({
				clientId: 'still-here',
			});
			expect(body).not.toMatchObject({
				clientUserId: expect.any(String),
			});
		});
		it('throws 400 if code in body conflicts with code in url', async () => {
			await createMainNode();
			await expect(basicHandler({ code: 'wrong-code' })).rejects.toThrow({
				status: 400,
				message: `Conflicting code property \`wrong-code\` in payload for MainType ${mainCode}`,
			});
			await neo4jTest('MainType', mainCode).notExists();
		});

		it('throws 400 if attempting to write property not in schema', async () => {
			await createMainNode();
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
		describe('generic error states', () => {
			it('throws if neo4j query fails', async () => {
				await createMainNode();
				dbUnavailable({ skip: 1 });
				await expect(basicHandler()).rejects.toThrow('oh no');
			});

			it.skip('throws if s3 query fails', async () => {
				await createMainNode();
				await expect(
					patchHandler({
						documentStore: {
							patch: asyncErrorFunction,
						},
					})(getInput({ someDocument: 'some document' })),
				).rejects.toThrow('oh no');
			});

			it.skip('undoes any s3 actions if neo4j query fails', async () => {
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
});
