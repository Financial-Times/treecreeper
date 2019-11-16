const neo4jTemporalTypes = require('neo4j-driver/lib/v1/temporal-types');
const { patchHandler } = require('../patch');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { spyDbQuery } = require('../../../test-helpers/db-spies');

describe('rest PATCH update', () => {
	const namespace = 'api-rest-handlers-patch-update';
	const mainCode = `${namespace}-main`;

	const { createNode, meta, getMetaPayload } = setupMocks(namespace);

	const getInput = (body, query, metadata) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const basicHandler = (...args) => patchHandler()(getInput(...args));

	const createMainNode = (props = {}) =>
		createNode('MainType', { code: mainCode, ...props });

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
				{ someString: 'updated string' },
				undefined,
				getMetaPayload(),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject(meta.update);
			await neo4jTest('MainType', mainCode)
				.exists()
				.match(meta.update);
		});
		it('sets array data', async () => {
			const { body, status } = await basicHandler({
				someStringList: ['one', 'two'],
				someMultipleChoice: ['First', 'Second'],
			});

			expect(status).toBe(201);
			expect(body).toMatchObject({
				someStringList: ['one', 'two'],
				someMultipleChoice: ['First', 'Second'],
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					someStringList: ['one', 'two'],
					someMultipleChoice: ['First', 'Second'],
				});
		});
		describe('temporal properties', () => {
			const neo4jTimePrecision = timestamp =>
				timestamp.replace('Z', '000000Z');

			describe('Date', () => {
				it('sets Date when no previous value', async () => {
					await createMainNode();
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
						someDate: new Date(date).toISOString(),
					});

					expect(status).toBe(200);
					expect(body).toMatchObject({
						someDate: date,
					});
					await neo4jTest('MainType', mainCode)
						.exists()
						.match({
							someDate: date,
						});
				});
				it("doesn't update when effectively the same Date", async () => {
					const date = '2019-01-09';
					await createMainNode({
						someDate: neo4jTemporalTypes.Date.fromStandardDate(
							new Date(date),
						),
					});
					const dbQuerySpy = spyDbQuery();
					const { status, body } = await basicHandler({
						someDate: new Date(date).toISOString(),
					});

					expect(status).toBe(200);
					expect(body).toMatchObject({
						someDate: date,
					});
					expect(dbQuerySpy()).not.toHaveBeenCalledWith(
						expect.stringMatching(/MERGE|CREATE/),
						expect.any(Object),
					);
				});
			});

			describe('Time', () => {
				it('sets Time when no previous value', async () => {
					await createMainNode();
					const time = '12:34:56.789Z';
					const { status, body } = await basicHandler({
						someTime: time,
					});

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

				it('updates existing Time', async () => {
					await createMainNode({
						someTime: neo4jTemporalTypes.Time.fromStandardDate(
							new Date('2018-01-09'),
						),
					});
					const time = '12:34:56.789Z';
					const { status, body } = await basicHandler({
						someTime: time,
					});

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

				it("doesn't update when effectively the same Time", async () => {
					const time = '12:34:56.789';
					await createMainNode({
						someTime: neo4jTemporalTypes.Time.fromStandardDate(
							new Date(`2018-01-09T${time}`),
						),
					});
					const dbQuerySpy = spyDbQuery();
					const { status } = await basicHandler({
						someTime: `${time}0000000`,
					});

					expect(status).toBe(200);
					expect(dbQuerySpy()).not.toHaveBeenCalledWith(
						expect.stringMatching(/MERGE|CREATE/),
						expect.any(Object),
					);
				});
			});

			describe('Datetime', () => {
				it('sets Datetime when no previous value', async () => {
					await createMainNode();
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
							someDatetime: neo4jTimePrecision(datetime),
						});
				});
				it('updates existing Datetime', async () => {
					await createMainNode({
						someDatetime: neo4jTemporalTypes.DateTime.fromStandardDate(
							new Date('2018-01-09T00:00:00.001Z'),
						),
					});
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
							someDatetime: neo4jTimePrecision(datetime),
						});
				});
				it("doesn't update when effectively the same Datetime", async () => {
					const datetime = '2019-01-09T00:00:00.001Z';
					await createMainNode({
						someDatetime: neo4jTemporalTypes.DateTime.fromStandardDate(
							new Date('2019-01-09T00:00:00.001Z'),
						),
					});
					const dbQuerySpy = spyDbQuery();
					const { status, body } = await basicHandler({
						someDatetime: datetime.replace('Z', '000Z'),
					});
					expect(status).toBe(200);
					expect(body).toMatchObject({
						someDatetime: neo4jTimePrecision(datetime),
					});
					expect(dbQuerySpy()).not.toHaveBeenCalledWith(
						expect.stringMatching(/MERGE|CREATE/),
						expect.any(Object),
					);
				});
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
			const { body } = await basicHandler(
				{ someString: 'some string' },
				undefined,
				{
					clientUserId: 'still-here',
				},
			);
			expect(body).toMatchObject({
				_updatedByUser: 'still-here',
			});
			expect(body).not.toMatchObject({
				_updatedByClient: expect.any(String),
			});
			await neo4jTest('MainType', mainCode).notMatch({
				_updatedByClient: expect.any(String),
			});
		});
		it('no clientUserId, deletes the _updatedByUser property', async () => {
			await createMainNode();
			const { body } = await basicHandler(
				{ someString: 'some string' },
				undefined,
				{
					clientId: 'still-here',
				},
			);
			expect(body).toMatchObject({
				_updatedByClient: 'still-here',
			});
			expect(body).not.toMatchObject({
				_updatedByUser: expect.any(String),
			});
			await neo4jTest('MainType', mainCode).notMatch({
				_updatedByUser: expect.any(String),
			});
		});
		it('throws 400 if code in body conflicts with code in url', async () => {
			await createMainNode();
			await expect(
				basicHandler({ code: 'wrong-code' }),
			).rejects.httpError({
				status: 400,
				message: `Conflicting code property \`wrong-code\` in payload for MainType ${mainCode}`,
			});
		});

		it('throws 400 if attempting to write property not in schema', async () => {
			await createMainNode();
			await expect(
				basicHandler({ notInSchema: 'a string' }),
			).rejects.httpError({
				status: 400,
				message: 'Invalid property `notInSchema` on type `MainType`.',
			});
			await neo4jTest('MainType', mainCode).notMatch({
				notInSchema: 'a string',
			});
		});
	});

	describe('generic error states', () => {
		it('throws if neo4j query fails', async () => {
			await createMainNode();
			dbUnavailable({ skip: 1 });
			await expect(
				basicHandler({ someString: 'a string' }),
			).rejects.toThrow('oh no');
		});
	});
});
