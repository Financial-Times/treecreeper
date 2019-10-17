const { patchHandler } = require('../patch');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { spyDbQuery } = require('../../../test-helpers/db-spies');

describe('rest PATCH field-locking', () => {
	const namespace = 'api-rest-handlers-patch-field-locking';
	const mainCode = `${namespace}-main`;
	const childCode = `${namespace}-child`;
	const clientId = `${namespace}-client`;
	const otherClientId = `${namespace}-other-client`;

	const { createNode } = setupMocks(namespace);

	const getInput = (body, query, metadata) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const lockHandler = (body, query) =>
		patchHandler()(getInput(body, query, { clientId }));

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	const lock = (client, ...fields) =>
		JSON.stringify(
			fields.reduce((obj, field) => ({ ...obj, [field]: client }), {}),
		);

	const lockedSomeString = lock(clientId, 'someString');
	const otherLockedSomeString = lock(otherClientId, 'someString');
	const lockedAnotherString = lock(clientId, 'anotherString');

	describe('locking', () => {
		describe('success', () => {
			it('writes a field that is unlocked', async () => {
				await createNode('MainType', {
					code: mainCode,
					someString: 'some string',
					_lockedFields: otherLockedSomeString,
				});
				const { status, body } = await lockHandler({
					anotherString: 'another string',
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'some string',
					anotherString: 'another string',
					_lockedFields: otherLockedSomeString,
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'some string',
					anotherString: 'another string',
					_lockedFields: otherLockedSomeString,
				});
			});
			it('writes a field that is locked by the same clientId', async () => {
				await createNode('MainType', {
					code: mainCode,
					someString: 'some string',
					_lockedFields: lockedSomeString,
				});
				const { status, body } = await lockHandler({
					someString: 'new some string',
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'new some string',
					_lockedFields: lockedSomeString,
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'new some string',
					_lockedFields: lockedSomeString,
				});
			});

			it('can lock all edited fields', async () => {
				await createNode('MainType', {
					code: mainCode,
					someString: 'some string',
				});
				const { status, body } = await lockHandler(
					{
						someString: 'new some string',
					},
					{ lockFields: 'all' },
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'new some string',
					_lockedFields: lockedSomeString,
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'new some string',
					_lockedFields: lockedSomeString,
				});
			});
			it('simultaneously writes and locks a field', async () => {
				await createNode('MainType', {
					code: mainCode,
					someString: 'some string',
				});
				const { status, body } = await lockHandler(
					{
						someString: 'new some string',
					},
					{ lockFields: 'someString' },
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'new some string',
					_lockedFields: lockedSomeString,
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'new some string',
					_lockedFields: lockedSomeString,
				});
			});

			it('does not add duplicates to locked field object', async () => {
				await createNode('MainType', {
					code: mainCode,
					someString: 'some string',
					_lockedFields: lockedSomeString,
				});
				const { status, body } = await lockHandler(
					{
						someString: 'new some string',
					},
					{ lockFields: 'someString' },
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'new some string',
					_lockedFields: lockedSomeString,
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'new some string',
					_lockedFields: lockedSomeString,
				});
			});
			it('merges new locked fields with existing', async () => {
				await createNode('MainType', {
					code: mainCode,
					someString: 'some string',
					_lockedFields: lockedAnotherString,
				});

				const { status, body } = await lockHandler(
					{
						someString: 'new some string',
					},
					{ lockFields: 'someString' },
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'new some string',
					_lockedFields: lock(
						clientId,
						'anotherString',
						'someString',
					),
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'new some string',
					_lockedFields: lock(
						clientId,
						'anotherString',
						'someString',
					),
				});
			});
			it('does NOT modify lock fields when just updating locked and unlocked fields', async () => {
				await createNode('MainType', {
					code: mainCode,
					someString: 'some string',
					anotherString: 'another string',
					_lockedFields: lockedSomeString,
				});

				const { status, body } = await lockHandler({
					someString: 'new some string',
					anotherString: 'new another string',
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'new some string',
					anotherString: 'new another string',
					_lockedFields: lockedSomeString,
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'new some string',
					anotherString: 'new another string',
					_lockedFields: lockedSomeString,
				});
			});
			it('can selectively lock fields that are being written to', async () => {
				await createNode('MainType', {
					code: mainCode,
					someString: 'some string',
					anotherString: 'another string',
				});

				const { status, body } = await lockHandler(
					{
						someString: 'new some string',
						anotherString: 'new another string',
					},
					{ lockFields: 'someString' },
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'new some string',
					anotherString: 'new another string',
					_lockedFields: lockedSomeString,
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'new some string',
					anotherString: 'new another string',
					_lockedFields: lockedSomeString,
				});
			});
			it('creates a new node with locked fields when no exisitng node exists', async () => {
				const { status, body } = await lockHandler(
					{
						someString: 'new some string',
					},
					{ lockFields: 'someString' },
				);

				expect(status).toBe(201);
				expect(body).toMatchObject({
					someString: 'new some string',
					_lockedFields: lockedSomeString,
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'new some string',
					_lockedFields: lockedSomeString,
				});
			});

			it('can lock fields without having to send any data changes', async () => {
				await createNode('MainType', {
					code: mainCode,
				});
				const { status, body } = await lockHandler(null, {
					lockFields: 'someString',
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					_lockedFields: lockedSomeString,
				});
				await neo4jTest('MainType', mainCode).match({
					_lockedFields: lockedSomeString,
				});
			});
			it('can lock fields when sending values that make no changes', async () => {
				await createNode('MainType', {
					code: mainCode,
					someString: 'some string',
				});

				const { status, body } = await lockHandler(
					{
						someString: 'some string',
					},
					{ lockFields: 'someString' },
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'some string',
					_lockedFields: lockedSomeString,
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'some string',
					_lockedFields: lockedSomeString,
				});
			});

			it("doesn't write when 'changing order' of locked fields", async () => {
				await createNode('MainType', {
					code: mainCode,
					someString: 'some string',
					_lockedFields: lock(
						clientId,
						'someString',
						'anotherString',
					),
				});

				const dbQuerySpy = spyDbQuery();

				const { status, body } = await lockHandler(null, {
					lockFields: 'anotherString,someString',
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'some string',
					_lockedFields: lock(
						clientId,
						'someString',
						'anotherString',
					),
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'some string',
					_lockedFields: lock(
						clientId,
						'someString',
						'anotherString',
					),
				});
				expect(dbQuerySpy).not.toHaveBeenCalledWith(
					expect.stringMatching(/MERGE|CREATE/),
				);
			});
		});

		describe('failure', () => {
			it('throws 400 when clientId is not set', async () => {
				await createMainNode();
				await expect(
					patchHandler()(
						getInput(
							{
								children: [childCode],
							},
							{ lockFields: 'someString' },
						),
					),
				).rejects.toThrow({
					status: 400,
					message:
						'clientId needs to be set to a valid system code in order to lock fields',
				});

				await await neo4jTest('MainType', mainCode).notMatch({
					_lockedFields: expect.any(String),
				});
			});
			it('throws 400 when trying to write a field that is locked by another clientId', async () => {
				await createNode('MainType', {
					code: mainCode,
					_lockedFields: otherLockedSomeString,
				});

				await expect(
					lockHandler({ someString: 'new some string' }),
				).rejects.toThrow({
					status: 400,
					message: "blah blah can't remember",
				});

				await await neo4jTest('MainType', mainCode).match({
					_lockedFields: otherLockedSomeString,
				});
			});
			it('throws 400 when trying to lock a field that is locked by another clientId', async () => {
				await createNode('MainType', {
					code: mainCode,
					_lockedFields: otherLockedSomeString,
				});

				await expect(
					lockHandler(null, { lockFields: 'someString' }),
				).rejects.toThrow({
					status: 400,
					message: "blah blah can't remember",
				});

				await await neo4jTest('MainType', mainCode).match({
					_lockedFields: otherLockedSomeString,
				});
			});
			it('throws 400 when locking all fields, including some that are locked by another clientId', async () => {
				await createNode('MainType', {
					code: mainCode,
					someString: 'some string',
					_lockedFields: otherLockedSomeString,
				});

				await expect(
					lockHandler(
						{
							someString: 'new some string',
						},
						{ lockFields: 'all' },
					),
				).rejects.toThrow({
					status: 400,
					message: `The following fields cannot be locked because they are locked by another client: someString is locked by ${otherClientId}`,
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'some string',
					_lockedFields: otherLockedSomeString,
				});
			});
		});
	});

	describe('unlocking fields', () => {
		it('unlocks specific fields', async () => {
			await createNode('MainType', {
				code: mainCode,
				_lockedFields: lockedSomeString,
			});
			const { status, body } = await lockHandler(null, {
				unlockFields: 'someString',
			});

			expect(status).toBe(200);
			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});

			await neo4jTest('MainType', mainCode).notMatch({
				_lockedFields: expect.any(String),
			});
		});

		it('unlocks fields when request is given by a different clientId', async () => {
			await createNode('MainType', {
				code: mainCode,
				_lockedFields: otherLockedSomeString,
			});
			const { status, body } = await lockHandler(null, {
				unlockFields: 'someString',
			});

			expect(status).toBe(200);
			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});

			await neo4jTest('MainType', mainCode).notMatch({
				_lockedFields: expect.any(String),
			});
		});

		it('unlocks `all` fields', async () => {
			await createNode('MainType', {
				code: mainCode,
				_lockedFields: lock(clientId, 'someString', 'anotherString'),
			});
			const { status, body } = await lockHandler(null, {
				unlockFields: 'all',
			});

			expect(status).toBe(200);
			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});

			await neo4jTest('MainType', mainCode).notMatch({
				_lockedFields: expect.any(String),
			});
		});

		it('unlocks a locked field and writes new value in same request', async () => {
			await createNode('MainType', {
				code: mainCode,
				someString: 'some string',
				_lockedFields: lockedSomeString,
			});
			const { status, body } = await lockHandler(
				{
					someString: 'new some string',
				},
				{ unlockFields: 'someString' },
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				someString: 'new some string',
			});
			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});
		});

		it('unlocks the locked field when value sent makes no changes', async () => {
			await createNode('MainType', {
				code: mainCode,
				someString: 'some string',
				_lockedFields: lockedSomeString,
			});
			const { status, body } = await lockHandler(
				{
					someString: 'some string',
				},
				{ unlockFields: 'someString' },
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				someString: 'some string',
			});
			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});
		});
	});
});
