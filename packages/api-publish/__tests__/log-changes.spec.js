jest.mock('../../api-express/lib/request-context');

const { logChanges } = require('..');
const { setupMocks } = require('../../../test-helpers');
const requestContext = require('../../api-express/lib/request-context');

describe('logChanges', () => {
	const namespace = 'api-publish-log-changes';
	const mainCode = `${namespace}-main`;
	const otherCode = `${namespace}-other`;
	const childCode = `${namespace}-child`;
	const mainType = 'MainType';
	const requestId = `${namespace}-default-request`;
	const anotherRequestId = `${requestId}-another`;

	beforeEach(() => {
		jest.spyOn(requestContext, 'getContext').mockReturnValue({
			requestId,
		});
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	setupMocks(namespace);

	const createMockAdaptor = () => ({
		getName: () => 'mock-adaptor',
		publish: jest.fn(async payload => payload),
	});

	const matcher = (action, type, code, props) => ({
		action,
		time: expect.any(Number),
		code,
		type,
		updatedProperties: expect.arrayContaining(props),
	});

	const mockNeo4jResult = (
		type,
		code,
		relType,
		relCode,
		props = {},
		reqId = requestId,
	) => ({
		records: [
			{
				get: item => {
					switch (item) {
						case 'node':
							return {
								labels: [type],
								properties: { ...props, code },
							};
						case 'related._createdByRequest':
							return reqId;
						default:
							throw new Error(`invalid item name of ${item}`);
					}
				},
				relatedCode: () => relCode,
				relatedType: () => relType,
			},
		],
	});

	describe('DELETE', () => {
		it('DELETE event should be sent with deleted properties', async () => {
			const neo4jResult = mockNeo4jResult(
				mainType,
				mainCode,
				'ChildType',
				childCode,
				{ someString: 'some string' },
			);
			const adaptor = createMockAdaptor();
			await logChanges('DELETE', neo4jResult, { adaptor });
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
		it('event should be sent with CREATE related event', async () => {
			const neo4jResult = mockNeo4jResult(
				mainType,
				mainCode,
				'ChildType',
				childCode,
				{ _createdByRequest: requestId, children: [childCode] },
			);
			const adaptor = createMockAdaptor();
			await logChanges('CREATE', neo4jResult, {
				adaptor,
				relationships: {
					added: { children: [childCode] },
				},
			});
			expect(adaptor.publish).toHaveBeenCalledTimes(2);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				1,
				matcher('CREATE', mainType, mainCode, ['children']),
			);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				2,
				matcher('CREATE', mainType, childCode, ['children']),
			);
		});
		it('event should be sent with UPDATE related event', async () => {
			const neo4jResult = mockNeo4jResult(
				mainType,
				mainCode,
				'ChildType',
				childCode,
				{ _createdByRequest: requestId, children: [childCode] },
				anotherRequestId,
			);
			const adaptor = createMockAdaptor();
			await logChanges('CREATE', neo4jResult, {
				adaptor,
				relationships: {
					added: { children: [childCode] },
				},
			});
			expect(adaptor.publish).toHaveBeenCalledTimes(2);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				1,
				matcher('CREATE', mainType, mainCode, ['children']),
			);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				2,
				matcher('UPDATE', mainType, childCode, ['children']),
			);
		});
	});

	describe('UPDATE', () => {
		it('should be sent with updated properties', async () => {
			const neo4jResult = mockNeo4jResult(
				mainType,
				mainCode,
				'ChildType',
				childCode,
				{
					someString: 'some string',
					children: [childCode],
					parents: [otherCode],
				},
			);
			const adaptor = createMockAdaptor();
			await logChanges('UPDATE', neo4jResult, {
				adaptor,
				relationships: {
					added: { children: [childCode] },
					removed: { parents: [otherCode] },
				},
			});
			expect(adaptor.publish).toHaveBeenCalledTimes(3);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				1,
				matcher('UPDATE', mainType, mainCode, ['someString']),
			);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				2,
				matcher('CREATE', mainType, childCode, ['children']),
			);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				3,
				matcher('UPDATE', 'ParentType', otherCode, []),
			);
		});

		it('should be sent with UPDATE related events', async () => {
			const neo4jResult = mockNeo4jResult(
				mainType,
				mainCode,
				'ChildType',
				childCode,
				{ someString: 'some string' },
				anotherRequestId,
			);
			const adaptor = createMockAdaptor();
			await logChanges('UPDATE', neo4jResult, {
				adaptor,
				relationships: {
					added: { favouriteChild: [childCode] },
					removed: { favouriteChild: [otherCode] },
				},
			});
			expect(adaptor.publish).toHaveBeenCalledTimes(3);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				1,
				matcher('UPDATE', mainType, mainCode, ['someString']),
			);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				2,
				matcher('UPDATE', mainType, childCode, ['favouriteChild']),
			);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				3,
				matcher('UPDATE', 'ChildType', otherCode, []),
			);
		});
	});
});
