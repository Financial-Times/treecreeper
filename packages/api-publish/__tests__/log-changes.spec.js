jest.mock('../../api-express/lib/request-context');

const { logChanges } = require('..');
const { setupMocks } = require('../../../test-helpers');
const {
	queryBuilder,
} = require('../../api-rest-handlers/lib/neo4j-query-builder');
const { executeQuery } = require('../../api-rest-handlers/lib/neo4j-model');
const { getNeo4jRecord } = require('../../api-rest-handlers/lib/read-helpers');
const requestContext = require('../../api-express/lib/request-context');

describe('logChanges', () => {
	const namespace = 'api-publish-log-changes';
	const mainCode = `${namespace}-main`;
	const otherCode = `${namespace}-other`;
	const childCode = `${namespace}-child`;
	const mainType = 'MainType';
	const requestId = `${namespace}-default-request`;

	beforeEach(() => {
		jest.spyOn(requestContext, 'getContext').mockReturnValue({});
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	const { createNode, createNodes } = setupMocks(namespace);

	const createMockAdaptor = () => ({
		getName: () => 'mock-adaptor',
		publish: jest.fn(async payload => payload),
	});

	const createMainNode = (code, props = {}) =>
		createNode(mainType, Object.assign({ code }, props));

	const matcher = (action, type, code, props) => ({
		action,
		time: expect.any(Number),
		code,
		type,
		updatedProperties: expect.arrayContaining(props),
	});

	describe('DELETE', () => {
		it('DELETE event should be sent with deleted properties', async () => {
			await createMainNode(mainCode);
			const neo4jResult = await executeQuery(
				`MATCH (node:${mainType} {code: $code}) RETURN node`,
				{ code: mainCode },
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
		it('event should be sent with related event with CREATE', async () => {
			jest.spyOn(requestContext, 'getContext').mockReturnValue({
				requestId,
			});

			await createNodes(['ChildType', { code: childCode }]);
			const builder = queryBuilder(
				'CREATE',
				{ type: mainType, code: mainCode, query: { upsert: true } },
				{ children: [childCode] },
			);
			builder.constructProperties();
			builder.createRelationships();
			const { neo4jResult, queryContext } = await builder.execute();
			const adaptor = createMockAdaptor();
			await logChanges('CREATE', neo4jResult, {
				adaptor,
				relationships: {
					added: queryContext.addedRelationships,
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
		it('event should be sent with related event with UPDATE', async () => {
			jest.spyOn(requestContext, 'getContext').mockReturnValue({
				requestId: `${requestId}-another`,
			});
			await createNodes(['ChildType', { code: childCode }]);
			const builder = queryBuilder(
				'CREATE',
				{ type: mainType, code: mainCode },
				{ children: [childCode] },
			);
			builder.constructProperties();
			builder.createRelationships();
			const { neo4jResult, queryContext } = await builder.execute();
			const adaptor = createMockAdaptor();
			await logChanges('CREATE', neo4jResult, {
				adaptor,
				relationships: {
					added: queryContext.addedRelationships,
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
			await createNodes(
				[mainType, { code: mainCode, someString: 'main string' }],
				[mainType, { code: otherCode, someString: 'other string' }],
			);
			const builder = queryBuilder(
				'MERGE',
				{ type: mainType, code: mainCode, query: { upsert: true } },
				{ someString: 'some string' },
			);
			const mainNode = await getNeo4jRecord(mainType, mainCode);
			const initialContent = mainNode.toJson(mainType);
			builder.constructProperties(initialContent);
			builder.removeRelationships(initialContent);
			builder.addRelationships(initialContent);
			const { neo4jResult, queryContext } = await builder.execute();
			const adaptor = createMockAdaptor();
			await logChanges('UPDATE', neo4jResult, {
				adaptor,
				relationships: {
					added: queryContext.addedRelationships,
					removed: queryContext.removedRelationships,
				},
			});
			expect(adaptor.publish).toHaveBeenCalledTimes(1);
			expect(adaptor.publish).toHaveBeenCalledWith(
				matcher('UPDATE', mainType, mainCode, ['someString']),
			);
		});
		it('should be sent with related events', async () => {
			await createNodes(
				[mainType, { code: mainCode, someString: 'main string' }],
				['ChildType', { code: childCode }],
			);
			const builder = queryBuilder(
				'MERGE',
				{ type: mainType, code: mainCode, query: { upsert: true } },
				{ someString: 'some string', favouriteChild: childCode },
			);
			const mainNode = await getNeo4jRecord(mainType, mainCode);
			const initialContent = mainNode.toJson(mainType);
			builder.constructProperties(initialContent);
			builder.removeRelationships(initialContent);
			builder.addRelationships(initialContent);
			const { neo4jResult, queryContext } = await builder.execute();
			const adaptor = createMockAdaptor();
			await logChanges('UPDATE', neo4jResult, {
				adaptor,
				relationships: {
					added: queryContext.addedRelationships,
					removed: queryContext.removedRelationships,
				},
			});
			expect(adaptor.publish).toHaveBeenCalledTimes(2);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				1,
				matcher('UPDATE', mainType, mainCode, ['someString']),
			);
			expect(adaptor.publish).toHaveBeenNthCalledWith(
				2,
				matcher('UPDATE', mainType, childCode, ['favouriteChild']),
			);
		});
	});
});
