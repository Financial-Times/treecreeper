jest.mock('@financial-times/tc-api-express-logger');
const schema = require('@financial-times/tc-schema-sdk')
const apiExpressLogger = require('@financial-times/tc-api-express-logger');
// const { setupMocks } = require('../../../test-helpers');
const { broadcast, emitter } = require('..');

describe('broadcast', () => {
	const namespace = 'api-publish-log-changes';
	const mainCode = `${namespace}-main`;
	const otherCode = `${namespace}-other`;
	const childCode = `${namespace}-child`;
	const mainType = 'MainType';
	const requestId = `${namespace}-default-request`;
	const anotherRequestId = `${requestId}-another`;

	// setupMocks(namespace);

	beforeAll(async () => {
		schema.init();
		await schema.ready()
		jest.spyOn(apiExpressLogger, 'getContext').mockReturnValue({
			requestId,
		});
		jest.spyOn(emitter, 'emit')
	});

	const matcher = (action, type, code, props) => ({
		action,
		time: expect.any(Number),
		code,
		type,
		updatedProperties: expect.arrayContaining(props),
	});

	const mockNeo4jResult = ({
		type,
		code,
		relType,
		relCode,
		props = {},
		relatedCreatedByRequestId = requestId,
	}) => ({
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
							return relatedCreatedByRequestId;
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
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				relType: 'ChildType',
				relCode: childCode,
				props: { someString: 'some string' },
			});

			await broadcast('DELETE', neo4jResult);
			expect(emitter.emit).toHaveBeenCalledWith('DELETE', {
				action: 'DELETE',
				time: expect.any(Number),
				code: mainCode,
				type: mainType,
				updatedProperties: expect.any(Array),
			});
		});
	});

	describe('CREATE', () => {
	it('should send a CREATE event', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				props: { _createdByRequest: requestId, someString: 'some string' },
			});

			await broadcast('CREATE', neo4jResult);
			expect(emitter.emit).toHaveBeenCalledTimes(2);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1, 'CREATE',
				matcher('CREATE', mainType, mainCode, ['someString']),
			);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				2, 'UPDATE',
				matcher('UPDATE', mainType, childCode, ['children']),
			);
		});
	it('should send extra UPDATE events when connecting to related nodes', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				relType: 'ChildType',
				relCode: childCode,
				props : { },				props: { _createdByRequest: requestId, children: [childCode], someString: 'some string'  },
				relatedCreatedByRequestId: anotherRequestId,
			});

			await broadcast('CREATE', neo4jResult, {

				relationships: {
					added: { children: [childCode] },
				},
			});
			expect(emitter.emit).toHaveBeenCalledTimes(2);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1, 'CREATE',
				matcher('CREATE', mainType, mainCode, ['someString', 'children']),
			);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				2, 'UPDATE',
				matcher('UPDATE', childType, childCode, ['isChildOf']),
			);
		});
	it('should send extra CREATE events when upserting to related nodes', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				relType: 'ChildType',
				relCode: childCode,
				props: { _createdByRequest: requestId, children: [childCode] },
			});

			await broadcast('CREATE', neo4jResult, {

				relationships: {
					added: { children: [childCode] },
				},
			});
			expect(emitter.emit).toHaveBeenCalledTimes(2);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1, 'CREATE',
				matcher('CREATE', mainType, mainCode, ['children']),
			);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				2, 'CREATE',
				matcher('CREATE', childType, childCode, ['isChildOf']),
			);
		});

	});

	describe('UPDATE', () => {
			it('should send an UPDATE event', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				props: { _createdByRequest: requestId, someString: 'some string' },
			});

			await broadcast('CREATE', neo4jResult);
			expect(emitter.emit).toHaveBeenCalledTimes(2);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1, 'UPDATE',
				matcher('UPDATE', mainType, mainCode, ['someString']),
			);
		});
		it('should send extra UPDATE events when connecting to related nodes', async () => {
			const neo4jResult = mockNeo4jResult({
				type : mainType,
				code : mainCode,
				relType : 'ChildType',
				relCode : childCode,
				props : { someString: 'some string' },
				relatedCreatedByRequestId: anotherRequestId,
			});

			await broadcast('UPDATE', neo4jResult, {

				relationships: {
					added: { favouriteChild: [childCode] },
					removed: { favouriteChild: [otherCode] },
				},
			});
			expect(emitter.emit).toHaveBeenCalledTimes(2);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1, 'UPDATE',
				matcher('UPDATE', mainType, mainCode, ['someString', 'favouriteChild']),
			);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				2, 'UPDATE',
				matcher('UPDATE', 'ChildType', otherCode, []),
			);
		});

				it('should send extra CREATE events when upserting to related nodes', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				relType: 'ChildType',
				relCode: childCode,
				props: {
					someString: 'some string',
					children: [childCode],
				},
			});

			await broadcast('UPDATE', neo4jResult, {

				relationships: {
					added: { children: [childCode] },
				},
			});
			expect(emitter.emit).toHaveBeenCalledTimes(1);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1, 'UPDATE',
				matcher('UPDATE', mainType, mainCode, ['someString', 'children']),
			);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				2, 'CREATE',
				matcher('CREATE', childType, childCode, ['isChildOf']),
			);
		});


	});
});
