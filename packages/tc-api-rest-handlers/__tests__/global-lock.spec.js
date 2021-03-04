const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { postHandler } = require('../post');
const { patchHandler } = require('../patch');

describe('global field locking', () => {
	const namespace = 'global-lock';
	const mainCode = `${namespace}-main`;

	const { createNode } = setupMocks(namespace);

	const payload = {
		type: 'LockedFieldTest',
		code: mainCode,
		body: { lockedField: 'some string' },
	};

	describe('post', () => {
		it('creates if using correct client', async () => {
			const { status, body } = await postHandler()({
				...payload,
				metadata: {
					clientId: 'global-lock-client',
				},
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				lockedField: 'some string',
			});

			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});
			await neo4jTest('LockedFieldTest', mainCode).exists().match({
				lockedField: 'some string',
			});
		});
		it('fails to create if using wrong client', async () => {
			await expect(
				postHandler()({
					...payload,
					metadata: {
						clientId: 'global-lock-client-wrong',
					},
				}),
			).rejects.httpError({
				status: 400,
				message:
					'Cannot write lockedField on LockedFieldTest global-lock-main - property can only be edited by client global-lock-client',
			});
			await neo4jTest('LockedFieldTest', mainCode).notExists();
		});
	});

	describe('patch', () => {
		it('patches if using correct client', async () => {
			await createNode('LockedFieldTest', { code: mainCode });
			const { status, body } = await patchHandler()({
				...payload,
				metadata: {
					clientId: 'global-lock-client',
				},
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				lockedField: 'some string',
			});

			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});
			await neo4jTest('LockedFieldTest', mainCode).exists().match({
				lockedField: 'some string',
			});
		});
		it('fails to patch if using wrong client', async () => {
			await createNode('LockedFieldTest', { code: mainCode });
			await expect(
				patchHandler()({
					...payload,
					metadata: {
						clientId: 'global-lock-client-wrong',
					},
				}),
			).rejects.httpError({
				status: 400,
				message:
					'Cannot write lockedField on LockedFieldTest global-lock-main - property can only be edited by client global-lock-client',
			});
			await neo4jTest('LockedFieldTest', mainCode).exists().notMatch({
				lockedField: 'some string',
			});
		});
	});
});
