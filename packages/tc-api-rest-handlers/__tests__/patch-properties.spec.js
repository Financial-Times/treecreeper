const neo4jTemporalTypes = require('neo4j-driver/lib/temporal-types');
const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { spyDbQuery } = require('../../../test-helpers/db-spies');

const { patchHandler } = require('../patch');

const patch = patchHandler();

describe('rest PATCH properties', () => {
	const namespace = 'api-rest-handlers-patch-properties';
	const mainCode = `${namespace}-main`;

	const { createNode, stockMetadata, getMetaPayload } = setupMocks(namespace);

	const typeAndCode = {
		type: 'KitchenSink',
		code: mainCode,
	};

	const typeCodeAndMeta = {
		...typeAndCode,
		metadata: getMetaPayload(),
	};

	const patchKitchenSinkRecord = (body, query) =>
		patch({
			...typeCodeAndMeta,
			body,
			query,
		});

	const createKitchenSinkRecord = (props = {}) =>
		createNode('KitchenSink', { code: mainCode, ...props });

	describe('updating disconnected records', () => {
		it('updates record with properties', async () => {
			await createKitchenSinkRecord({
				firstStringProperty: 'some string',
				booleanProperty: true,
				enumProperty: 'First',
			});
			const { status, body } = await patchKitchenSinkRecord({
				firstStringProperty: 'updated string',
				secondStringProperty: 'another string',
				booleanProperty: false,
				enumProperty: 'Second',
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				firstStringProperty: 'updated string',
				secondStringProperty: 'another string',
				booleanProperty: false,
				enumProperty: 'Second',
			});
			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.match({
					code: mainCode,
					firstStringProperty: 'updated string',
					secondStringProperty: 'another string',
					booleanProperty: false,
					enumProperty: 'Second',
				})
				.noRels();
		});
		it('updates metadata', async () => {
			await createKitchenSinkRecord();
			const { status, body } = await patchKitchenSinkRecord(
				{ firstStringProperty: 'updated string' },
				undefined,
				getMetaPayload(),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject(stockMetadata.update);
			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.match(stockMetadata.update);
		});
		it('deletes a property as an update', async () => {
			await createKitchenSinkRecord({
				firstStringProperty: 'firstStringProperty',
			});
			const { body, status } = await patchKitchenSinkRecord({
				firstStringProperty: null,
			});
			expect(status).toBe(200);
			expect(body).not.toMatchObject({
				firstStringProperty: 'firstStringProperty',
			});
			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.notHave('firstStringProperty');
		});
		it('sets array data', async () => {
			const { body, status } = await patchKitchenSinkRecord({
				// // someStringList: ['one', 'two'],
				multipleChoiceEnumProperty: ['First', 'Second'],
			});

			expect(status).toBe(201);
			expect(body).toMatchObject({
				// // someStringList: ['one', 'two'],
				multipleChoiceEnumProperty: ['First', 'Second'],
			});
			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.match({
					// // someStringList: ['one', 'two'],
					multipleChoiceEnumProperty: ['First', 'Second'],
				});
		});
		describe('temporal properties', () => {
			const neo4jTimePrecision = timestamp =>
				timestamp.replace('Z', '000000Z');

			describe('Date', () => {
				it('sets Date when no previous value', async () => {
					await createKitchenSinkRecord();
					const date = '2019-01-09';
					const { status, body } = await patchKitchenSinkRecord({
						dateProperty: new Date(date).toISOString(),
					});

					expect(status).toBe(200);
					expect(body).toMatchObject({
						code: mainCode,
						dateProperty: date,
					});
					await neo4jTest('KitchenSink', mainCode).exists().match({
						dateProperty: date,
					});
				});
				it('updates existing Date', async () => {
					await createKitchenSinkRecord({
						dateProperty: neo4jTemporalTypes.Date.fromStandardDate(
							new Date('2018-01-09'),
						),
					});
					const date = '2019-01-09';
					const { status, body } = await patchKitchenSinkRecord({
						dateProperty: new Date(date).toISOString(),
					});

					expect(status).toBe(200);
					expect(body).toMatchObject({
						dateProperty: date,
					});
					await neo4jTest('KitchenSink', mainCode).exists().match({
						dateProperty: date,
					});
				});
				it("doesn't update when effectively the same Date", async () => {
					const date = '2019-01-09';
					await createKitchenSinkRecord({
						dateProperty: neo4jTemporalTypes.Date.fromStandardDate(
							new Date(date),
						),
					});
					const dbQuerySpy = spyDbQuery();
					const { status, body } = await patchKitchenSinkRecord({
						dateProperty: new Date(date).toISOString(),
					});

					expect(status).toBe(200);
					expect(body).toMatchObject({
						dateProperty: date,
					});
					expect(dbQuerySpy).not.toHaveBeenCalledWith(
						expect.stringMatching(/MERGE|CREATE/),
						expect.any(Object),
					);
				});
			});

			describe('Time', () => {
				it('sets Time when no previous value', async () => {
					await createKitchenSinkRecord();
					const time = '12:34:56.789Z';
					const { status, body } = await patchKitchenSinkRecord({
						timeProperty: time,
					});

					expect(status).toBe(200);
					expect(body).toMatchObject({
						timeProperty: neo4jTimePrecision(time),
					});
					await neo4jTest('KitchenSink', mainCode)
						.exists()
						.match({
							code: mainCode,
							timeProperty: neo4jTimePrecision(time),
						})
						.noRels();
				});

				it('updates existing Time', async () => {
					await createKitchenSinkRecord({
						timeProperty: neo4jTemporalTypes.Time.fromStandardDate(
							new Date('2018-01-09'),
						),
					});
					const time = '12:34:56.789Z';
					const { status, body } = await patchKitchenSinkRecord({
						timeProperty: time,
					});

					expect(status).toBe(200);
					expect(body).toMatchObject({
						timeProperty: neo4jTimePrecision(time),
					});
					await neo4jTest('KitchenSink', mainCode)
						.exists()
						.match({
							code: mainCode,
							timeProperty: neo4jTimePrecision(time),
						})
						.noRels();
				});

				it("doesn't update when effectively the same Time", async () => {
					const time = '12:34:56.789';
					await createKitchenSinkRecord({
						timeProperty: neo4jTemporalTypes.Time.fromStandardDate(
							new Date(`2018-01-09T${time}`),
						),
					});
					const dbQuerySpy = spyDbQuery();
					const { status } = await patchKitchenSinkRecord({
						timeProperty: `${time}0000000`,
					});

					expect(status).toBe(200);
					expect(dbQuerySpy).not.toHaveBeenCalledWith(
						expect.stringMatching(/MERGE|CREATE/),
						expect.any(Object),
					);
				});
			});

			describe('Datetime', () => {
				it('sets Datetime when no previous value', async () => {
					await createKitchenSinkRecord();
					const datetime = '2019-01-09T00:00:00.001Z';
					const { status, body } = await patchKitchenSinkRecord({
						datetimeProperty: datetime,
					});

					expect(status).toBe(200);
					expect(body).toMatchObject({
						datetimeProperty: neo4jTimePrecision(datetime),
					});
					await neo4jTest('KitchenSink', mainCode)
						.exists()
						.match({
							datetimeProperty: neo4jTimePrecision(datetime),
						});
				});
				it('updates existing Datetime', async () => {
					await createKitchenSinkRecord({
						datetimeProperty: neo4jTemporalTypes.DateTime.fromStandardDate(
							new Date('2018-01-09T00:00:00.001Z'),
						),
					});
					const datetime = '2019-01-09T00:00:00.001Z';
					const { status, body } = await patchKitchenSinkRecord({
						datetimeProperty: datetime,
					});

					expect(status).toBe(200);
					expect(body).toMatchObject({
						datetimeProperty: neo4jTimePrecision(datetime),
					});
					await neo4jTest('KitchenSink', mainCode)
						.exists()
						.match({
							datetimeProperty: neo4jTimePrecision(datetime),
						});
				});
				it("doesn't update when effectively the same Datetime", async () => {
					const datetime = '2019-01-09T00:00:00.001Z';
					await createKitchenSinkRecord({
						datetimeProperty: neo4jTemporalTypes.DateTime.fromStandardDate(
							new Date('2019-01-09T00:00:00.001Z'),
						),
					});
					const dbQuerySpy = spyDbQuery();
					const { status, body } = await patchKitchenSinkRecord({
						datetimeProperty: datetime.replace('Z', '000Z'),
					});
					expect(status).toBe(200);
					expect(body).toMatchObject({
						datetimeProperty: neo4jTimePrecision(datetime),
					});
					expect(dbQuerySpy).not.toHaveBeenCalledWith(
						expect.stringMatching(/MERGE|CREATE/),
						expect.any(Object),
					);
				});
			});
		});

		it('unsets a property when empty string provided', async () => {
			await createKitchenSinkRecord({
				firstStringProperty: 'some string',
			});
			const { status, body } = await patchKitchenSinkRecord({
				firstStringProperty: '',
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
			});

			await neo4jTest('KitchenSink', mainCode)
				.exists()
				.notMatch({
					firstStringProperty: expect.any(String),
				});
		});
		it('not unset property when falsy value provided', async () => {
			await createKitchenSinkRecord('KitchenSink', {
				booleanProperty: true,
				integerProperty: 1,
			});
			const { body } = await patchKitchenSinkRecord({
				booleanProperty: false,
				integerProperty: 0,
			});
			expect(body).toMatchObject({
				booleanProperty: false,
				integerProperty: 0,
			});
			await neo4jTest('KitchenSink', mainCode).exists().match({
				booleanProperty: false,
				integerProperty: 0,
			});
		});
		it('no clientId, deletes the _updatedByClient property', async () => {
			await createKitchenSinkRecord();
			const { body } = await patch({
				...typeAndCode,
				body: { firstStringProperty: 'some string' },
				metadata: {
					clientUserId: 'still-here',
				},
			});
			expect(body).toMatchObject({
				_updatedByUser: 'still-here',
			});
			expect(body).not.toMatchObject({
				_updatedByClient: expect.any(String),
			});
			await neo4jTest('KitchenSink', mainCode).notMatch({
				_updatedByClient: expect.any(String),
			});
		});

		it('no clientUserId, deletes the _updatedByUser property', async () => {
			await createKitchenSinkRecord();
			const { body } = await patch({
				...typeAndCode,
				body: { firstStringProperty: 'some string' },
				metadata: {
					clientId: 'still-here',
				},
			});
			expect(body).toMatchObject({
				_updatedByClient: 'still-here',
			});
			expect(body).not.toMatchObject({
				_updatedByUser: expect.any(String),
			});
			await neo4jTest('KitchenSink', mainCode).notMatch({
				_updatedByUser: expect.any(String),
			});
		});

		it('throws 400 if code in body conflicts with code in url', async () => {
			await createKitchenSinkRecord();
			await expect(
				patchKitchenSinkRecord({ code: 'wrong-code' }),
			).rejects.httpError({
				status: 400,
				message: `Conflicting code property \`wrong-code\` in payload for KitchenSink ${mainCode}`,
			});
		});

		it('throws 400 if attempting to write property not in schema', async () => {
			await createKitchenSinkRecord();
			await expect(
				patchKitchenSinkRecord({ notInSchema: 'a string' }),
			).rejects.httpError({
				status: 400,
				message:
					'Invalid property `notInSchema` on type `KitchenSink`.',
			});
			await neo4jTest('KitchenSink', mainCode).notMatch({
				notInSchema: 'a string',
			});
		});
	});

	describe('generic error states', () => {
		it('throws if neo4j query fails', async () => {
			await createKitchenSinkRecord();
			dbUnavailable({ skip: 1 });
			await expect(
				patchKitchenSinkRecord({ firstStringProperty: 'a string' }),
			).rejects.toThrow('oh no');
		});
	});
});
