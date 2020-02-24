const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { postHandler } = require('../post');
const { patchHandler } = require('../patch');

describe('global field locking', () => {
	const namespace = 'global-lock';
	const mainCode = `${namespace}-main`;

	const { createNode } = setupMocks(namespace);

	const getInput = (body, query, metadata) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	describe('post', () => {
		it('creates if using correct client', async () => {
			const { status, body } = await postHandler()(
				getInput({ lockedField: 'some string' }, undefined, {
					clientId: 'global-lock-client',
				}),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				lockedField: 'some string',
			});

			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					lockedField: 'some string',
				});
		});
		it('fails to create if using wrong client', async () => {
			await expect(
				postHandler()(
					getInput({ lockedField: 'some string' }, undefined, {
						clientId: 'global-lock-client-wrong',
					}),
				),
			).rejects.httpError({
				status: 400,
				message:
					'Cannot write lockedField on MainType global-lock-main - property can only be edited by client global-lock-client',
			});
			await neo4jTest('MainType', mainCode).notExists();
		});
	});

	describe('patch', () => {
		it('patches if using correct client', async () => {
			await createNode('MainType', { code: mainCode });
			const { status, body } = await patchHandler()(
				getInput({ lockedField: 'some string' }, undefined, {
					clientId: 'global-lock-client',
				}),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				lockedField: 'some string',
			});

			expect(body).not.toMatchObject({
				_lockedFields: expect.any(String),
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					lockedField: 'some string',
				});
		});
		it('fails to patch if using wrong client', async () => {
			await createNode('MainType', { code: mainCode });
			await expect(
				patchHandler()(
					getInput({ lockedField: 'some string' }, undefined, {
						clientId: 'global-lock-client-incorrect',
					}),
				),
			).rejects.httpError({
				status: 400,
				message:
					'Cannot write lockedField on MainType global-lock-main - property can only be edited by client global-lock-client',
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.notMatch({
					lockedField: 'some string',
				});
		});
	});
});
