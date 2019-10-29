const { logChanges } = require('..');
const { setupMocks } = require('../../../test-helpers');
const { getNeo4jRecord } = require('../../api-rest-handlers/lib/read-helpers');

describe('logChanges', () => {
	const namespace = 'api-publish-log-changes';
	const mainCode = `${namespace}-main`;
	const otherCode = `${namespace}-other`;
	const mainType = 'MainType';

	const { createNode, createNodes, connectNodes } = setupMocks(namespace);

	const createMockAdaptor = () => ({
		getName: () => 'mock-adaptor',
		publish: jest.fn(async payload => payload),
	});

	const createMainNode = (code, props = {}) =>
		createNode(mainType, Object.assign({ code }, props));

	describe('DELETE', () => {
		it('DELETE event should be sent with deleted properties', async () => {
			await createMainNode(mainCode);
			const result = await getNeo4jRecord(mainType, mainCode);
			const adaptor = createMockAdaptor();
			await logChanges('DELETE', result, { adaptor });
			expect(adaptor.publish).toHaveBeenCalledWith({
				action: 'DELETE',
				time: expect.any(Number),
				code: mainCode,
				type: mainType,
				updatedProperties: expect.any(Array),
			});
		});
	});

	describe('CREATE', () => {
		it('CREATE event should be sent with created properties', async () => {
			const [main, other] = await createNodes(
				[mainType, { code: mainCode, someString: 'main string' }],
				[mainType, { code: otherCode, someString: 'other string' }],
			);
			await connectNodes([main, 'HAS_CHILD', other]);
			const result = await getNeo4jRecord(mainType, mainCode);
			const adaptor = createMockAdaptor();
			await logChanges('CREATE', result, {
				adaptor,
				relationships: {
					added: {
						someString: [otherCode],
					},
				},
			});
			expect(adaptor.publish).toHaveBeenCalledTimes(2);
			expect(adaptor.publish).toHaveBeenNthCalledWith(1, {
				action: 'CREATE',
				time: expect.any(Number),
				code: mainCode,
				type: mainType,
				updatedProperties: expect.arrayContaining(['someString']),
			});
			// TODO: test for related records
		});
	});

	describe('UPDATE', () => {
		it('UPDATE event should be sent with updated properties', async () => {
			const [main, other] = await createNodes(
				[mainType, { code: mainCode, someString: 'main string' }],
				[mainType, { code: otherCode, someString: 'other string' }],
			);
			await connectNodes([main, 'HAS_CHILD', other]);
			const result = await getNeo4jRecord(mainType, mainCode);
			const adaptor = createMockAdaptor();
			await logChanges('UPDATE', result, {
				adaptor,
				relationships: {
					added: {
						someString: [otherCode],
					},
				},
			});
			expect(adaptor.publish).toHaveBeenCalledTimes(2);
			expect(adaptor.publish).toHaveBeenNthCalledWith(1, {
				action: 'UPDATE',
				time: expect.any(Number),
				code: mainCode,
				type: mainType,
				updatedProperties: expect.arrayContaining(['someString']),
			});
			// TODO: test for related records
		});
	});
});
