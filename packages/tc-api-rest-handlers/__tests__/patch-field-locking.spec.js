const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { spyDbQuery } = require('../../../test-helpers/db-spies');

const { patchHandler } = require('../patch');

const patch = patchHandler();

describe('rest PATCH field-locking', () => {
	const namespace = 'api-rest-handlers-patch-field-locking';
	const mainCode = `${namespace}-main`;
	const mainClientId = `${namespace}-client`;
	const otherClientId = `${namespace}-other-client`;

	const { createNode } = setupMocks(namespace);

	const typeAndCode = {
		type: 'PropertiesTest',
		code: mainCode,
	};

	const typeCodeAndClient = {
		...typeAndCode,
		metadata: { clientId: mainClientId },
	};

	const getLockMetadata = (clientId, ...fields) =>
		JSON.stringify(
			fields.reduce((obj, field) => ({ ...obj, [field]: clientId }), {}),
		);

	const createLockedRecord = (clientId, ...fields) =>
		createNode('PropertiesTest', {
			code: mainCode,
			firstStringProperty: 'first string',
			secondStringProperty: 'second string',
			_lockedFields: getLockMetadata(clientId, ...fields),
		});

	const createUnlockedRecord = () =>
		createNode('PropertiesTest', {
			code: mainCode,
			firstStringProperty: 'first string',
			secondStringProperty: 'second string',
		});

	describe('locking', () => {
		describe('success', () => {
			it('writes a field that is unlocked', async () => {
				await createLockedRecord(otherClientId, 'firstStringProperty');
				const { status, body } = await patch({
					...typeCodeAndClient,
					body: {
						secondStringProperty: 'new second string',
					},
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					firstStringProperty: 'first string',
					secondStringProperty: 'new second string',
					_lockedFields: getLockMetadata(
						otherClientId,
						'firstStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'first string',
					secondStringProperty: 'new second string',
					_lockedFields: getLockMetadata(
						otherClientId,
						'firstStringProperty',
					),
				});
			});

			it('writes a field that is locked by the same mainClientId', async () => {
				await createLockedRecord(mainClientId, 'firstStringProperty');

				const { status, body } = await patch({
					...typeCodeAndClient,
					body: {
						firstStringProperty: 'new first string',
					},
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
			});

			it('can lock all edited fields', async () => {
				await createUnlockedRecord();
				const { status, body } = await patch({
					...typeCodeAndClient,
					body: {
						firstStringProperty: 'new first string',
					},
					query: { lockFields: 'all' },
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
			});
			it('simultaneously writes and locks a field', async () => {
				await createUnlockedRecord();
				const { status, body } = await patch({
					...typeCodeAndClient,
					body: {
						firstStringProperty: 'new first string',
					},
					query: { lockFields: 'firstStringProperty' },
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
			});

			it('does not add duplicates to locked field object', async () => {
				await createLockedRecord(mainClientId, 'firstStringProperty');
				const { status, body } = await patch({
					...typeCodeAndClient,
					body: {
						firstStringProperty: 'new first string',
					},
					query: { lockFields: 'firstStringProperty' },
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
			});
			it('merges new locked fields with existing', async () => {
				await createLockedRecord(mainClientId, 'secondStringProperty');

				const { status, body } = await patch({
					...typeCodeAndClient,
					body: {
						firstStringProperty: 'new first string',
					},
					query: { lockFields: 'firstStringProperty' },
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'secondStringProperty',
						'firstStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'secondStringProperty',
						'firstStringProperty',
					),
				});
			});
			it('does NOT modify getLockMetadata fields when just updating locked and unlocked fields', async () => {
				await createLockedRecord(mainClientId, 'firstStringProperty');

				const { status, body } = await patch({
					...typeCodeAndClient,
					body: {
						firstStringProperty: 'new first string',
						secondStringProperty: 'new another string',
					},
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					firstStringProperty: 'new first string',
					secondStringProperty: 'new another string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'new first string',
					secondStringProperty: 'new another string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
			});
			it('can selectively getLockMetadata fields that are being written to', async () => {
				await createUnlockedRecord();

				const { status, body } = await patch({
					...typeCodeAndClient,
					body: {
						firstStringProperty: 'new first string',
						secondStringProperty: 'new another string',
					},
					query: { lockFields: 'firstStringProperty' },
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					firstStringProperty: 'new first string',
					secondStringProperty: 'new another string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'new first string',
					secondStringProperty: 'new another string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
			});
			it('creates a new node with locked fields when no exisitng node exists', async () => {
				const { status, body } = await patch({
					...typeCodeAndClient,
					body: {
						firstStringProperty: 'new first string',
					},
					query: { lockFields: 'firstStringProperty' },
				});

				expect(status).toBe(201);
				expect(body).toMatchObject({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'new first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
			});

			it('can lock fields without having to send any data changes', async () => {
				await createUnlockedRecord();
				const { status, body } = await patch({
					...typeCodeAndClient,
					query: {
						lockFields: 'firstStringProperty',
					},
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
			});
			it('can lock fields when sending values that make no changes', async () => {
				await createUnlockedRecord();

				const { status, body } = await patch({
					...typeCodeAndClient,
					body: {
						firstStringProperty: 'first string',
					},
					query: { lockFields: 'firstStringProperty' },
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					firstStringProperty: 'first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
					),
				});
			});

			it("doesn't write when 'changing order' of locked fields", async () => {
				await createLockedRecord(
					mainClientId,
					'firstStringProperty',
					'secondStringProperty',
				);

				const dbQuerySpy = spyDbQuery();

				const { status, body } = await patch({
					...typeCodeAndClient,
					query: {
						lockFields: 'secondStringProperty,firstStringProperty',
					},
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					firstStringProperty: 'first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
						'secondStringProperty',
					),
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'first string',
					_lockedFields: getLockMetadata(
						mainClientId,
						'firstStringProperty',
						'secondStringProperty',
					),
				});
				expect(dbQuerySpy).not.toHaveBeenCalledWith(
					expect.stringMatching(/MERGE|CREATE/),
				);
			});
		});

		describe('failure', () => {
			it('throws 400 when clientId is not set', async () => {
				await createUnlockedRecord();
				await expect(
					patch({
						...typeAndCode,

						body: {
							secondStringProperty: 'blah',
						},
						query: {
							lockFields: 'firstStringProperty',
							relationshipAction: 'merge',
						},
					}),
				).rejects.httpError({
					status: 400,
					message:
						'clientId needs to be set to a valid system code in order to lock fields',
				});

				await neo4jTest('PropertiesTest', mainCode).notMatch({
					_lockedFields: expect.any(String),
				});
			});
			it('throws 409 when trying to write a field that is locked by another mainClientId', async () => {
				await createLockedRecord(otherClientId, 'firstStringProperty');

				await expect(
					patch({
						...typeCodeAndClient,
						body: { firstStringProperty: 'new first string' },
					}),
				).rejects.httpError({
					status: 409,
					message: `The following fields cannot be written because they are locked by another client: firstStringProperty is locked by ${otherClientId}`,
				});

				await neo4jTest('PropertiesTest', mainCode).match({
					_lockedFields: getLockMetadata(
						otherClientId,
						'firstStringProperty',
					),
				});
			});
			it('throws 409 when trying to getLockMetadata a field that is locked by another mainClientId', async () => {
				await createLockedRecord(otherClientId, 'firstStringProperty');

				await expect(
					patch({
						...typeCodeAndClient,
						query: {
							lockFields: 'firstStringProperty',
						},
					}),
				).rejects.httpError({
					status: 409,
					message: `The following fields cannot be locked because they are locked by another client: firstStringProperty is locked by ${otherClientId}`,
				});

				await neo4jTest('PropertiesTest', mainCode).match({
					_lockedFields: getLockMetadata(
						otherClientId,
						'firstStringProperty',
					),
				});
			});
			it('throws 409 when locking all fields, including some that are locked by another mainClientId', async () => {
				await createLockedRecord(otherClientId, 'firstStringProperty');

				await expect(
					patch({
						...typeCodeAndClient,
						body: {
							firstStringProperty: 'new first string',
						},
						query: { lockFields: 'all' },
					}),
				).rejects.httpError({
					status: 409,
					message: `The following fields cannot be locked because they are locked by another client: firstStringProperty is locked by ${otherClientId}`,
				});
				await neo4jTest('PropertiesTest', mainCode).match({
					firstStringProperty: 'first string',
					_lockedFields: getLockMetadata(
						otherClientId,
						'firstStringProperty',
					),
				});
			});
		});
	});

	describe('unlocking fields', () => {
		it('unlocks specific fields', async () => {
			await createLockedRecord(mainClientId, 'firstStringProperty');
			const { status, body } = await patch({
				...typeCodeAndClient,
				query: {
					unlockFields: 'firstStringProperty',
				},
			});

			expect(status).toBe(200);
			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});

			await neo4jTest('PropertiesTest', mainCode).notMatch({
				_lockedFields: expect.any(String),
			});
		});

		it('unlocks fields when request is given by a different mainClientId', async () => {
			await createLockedRecord(otherClientId, 'firstStringProperty');
			const { status, body } = await patch({
				...typeCodeAndClient,
				query: {
					unlockFields: 'firstStringProperty',
				},
			});

			expect(status).toBe(200);
			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});

			await neo4jTest('PropertiesTest', mainCode).notMatch({
				_lockedFields: expect.any(String),
			});
		});

		it('unlocks `all` fields', async () => {
			await createLockedRecord(
				mainClientId,
				'firstStringProperty',
				'secondStringProperty',
			);
			const { status, body } = await patch({
				...typeCodeAndClient,
				query: {
					unlockFields: 'all',
				},
			});

			expect(status).toBe(200);
			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});

			await neo4jTest('PropertiesTest', mainCode).notMatch({
				_lockedFields: expect.any(String),
			});
		});

		it('unlocks a locked field and writes new value in same request', async () => {
			await createLockedRecord(mainClientId, 'firstStringProperty');
			const { status, body } = await patch({
				...typeCodeAndClient,
				body: {
					firstStringProperty: 'new first string',
				},
				query: { unlockFields: 'firstStringProperty' },
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				firstStringProperty: 'new first string',
			});
			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});
		});

		it('unlocks the locked field when value sent makes no changes', async () => {
			await createLockedRecord(mainClientId, 'firstStringProperty');
			const { status, body } = await patch({
				...typeCodeAndClient,
				body: {
					firstStringProperty: 'first string',
				},
				query: { unlockFields: 'firstStringProperty' },
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				firstStringProperty: 'first string',
			});
			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});
		});
	});
});
