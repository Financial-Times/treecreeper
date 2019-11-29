jest.mock('@financial-times/tc-api-express-logger');
const schema = require('@financial-times/tc-schema-sdk');
const apiExpressLogger = require('@financial-times/tc-api-express-logger');
const { broadcast, emitter } = require('..');

describe('broadcast', () => {
	const namespace = 'api-publish-log-changes';
	const mainCode = `${namespace}-main`;
	const childCode = `${namespace}-child`;
	const mainType = 'MainType';
	const childType = 'ChildType';
	const requestId = `${namespace}-default-request`;
	const anotherRequestId = `${requestId}-another`;

	beforeAll(async () => {
		schema.init();
		await schema.ready();
		jest.spyOn(apiExpressLogger, 'getContext').mockReturnValue({
			requestId,
		});
		jest.spyOn(emitter, 'emit');
	});

	beforeEach(() => jest.clearAllMocks());

	const matcher = (action, type, code, props) => ({
		action,
		time: expect.any(Number),
		code,
		type,
		updatedProperties: props,
	});

	const mockNeo4jResult = ({ type, code, props = {}, related = [] }) => {
		return {
			records: related.length
				? related.map(
						({
							type: relType,
							code: relCode,
							requestId: relatedRequestId = requestId,
						}) => ({
							get: item => {
								switch (item) {
									case 'node':
										return {
											labels: [type],
											properties: { ...props, code },
										};
									case 'related._createdByRequest':
										return relatedRequestId;
									default:
										throw new Error(
											`invalid item name of ${item}`,
										);
								}
							},
							relatedCode: () => relCode,
							relatedType: () => relType,
						}),
				  )
				: [
						{
							get: item => {
								switch (item) {
									case 'node':
										return {
											labels: [type],
											properties: { ...props, code },
										};
									default:
										throw new Error(
											`invalid item name of ${item}`,
										);
								}
							},
						},
				  ],
		};
	};

	describe('DELETE', () => {
		it('DELETE event should be sent with deleted properties', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
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
				props: {
					_createdByRequest: requestId,
					someString: 'some string',
				},
			});

			await broadcast('CREATE', neo4jResult);
			expect(emitter.emit).toHaveBeenCalledTimes(1);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1,
				'CREATE',
				matcher('CREATE', mainType, mainCode, ['code', 'someString']),
			);
		});
		it('should send extra UPDATE events when connecting to related nodes', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				props: {
					_createdByRequest: requestId,
					someString: 'some string',
				},
				related: [
					{
						code: childCode,
						type: childType,
						requestId: anotherRequestId,
					},
				],
			});

			await broadcast('CREATE', neo4jResult, {
				relationships: {
					added: { children: [childCode] },
				},
			});
			expect(emitter.emit).toHaveBeenCalledTimes(2);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1,
				'CREATE',
				matcher('CREATE', mainType, mainCode, [
					'children',
					'code',
					'someString',
				]),
			);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				2,
				'UPDATE',
				matcher('UPDATE', childType, childCode, ['isChildOf']),
			);
		});
		it('should send extra CREATE events when upserting to related nodes', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				props: { _createdByRequest: requestId },
				related: [
					{
						code: childCode,
						type: childType,
					},
				],
			});

			await broadcast('CREATE', neo4jResult, {
				relationships: {
					added: { children: [childCode] },
				},
			});
			expect(emitter.emit).toHaveBeenCalledTimes(2);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1,
				'CREATE',
				matcher('CREATE', mainType, mainCode, ['children', 'code']),
			);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				2,
				'CREATE',
				matcher('CREATE', childType, childCode, ['code', 'isChildOf']),
			);
		});
	});

	describe('UPDATE', () => {
		it('should send an UPDATE event', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				props: {
					someString: 'some string',
				},
			});

			await broadcast('UPDATE', neo4jResult);
			expect(emitter.emit).toHaveBeenCalledTimes(1);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1,
				'UPDATE',
				matcher('UPDATE', mainType, mainCode, ['someString']),
			);
		});
		it('should send extra UPDATE events when connecting to related nodes', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				props: { someString: 'some string' },
				related: [
					{
						code: childCode,
						type: childType,
						requestId: anotherRequestId,
					},
				],
			});

			await broadcast('UPDATE', neo4jResult, {
				relationships: {
					added: { children: [childCode] },
				},
			});
			expect(emitter.emit).toHaveBeenCalledTimes(2);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1,
				'UPDATE',
				matcher('UPDATE', mainType, mainCode, [
					'children',
					'someString',
				]),
			);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				2,
				'UPDATE',
				matcher('UPDATE', 'ChildType', childCode, ['isChildOf']),
			);
		});

		it('should send extra CREATE events when upserting to related nodes', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				props: {
					someString: 'some string',
				},
				related: [
					{
						code: childCode,
						type: childType,
					},
				],
			});

			await broadcast('UPDATE', neo4jResult, {
				relationships: {
					added: { children: [childCode] },
				},
			});
			expect(emitter.emit).toHaveBeenCalledTimes(2);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1,
				'UPDATE',
				matcher('UPDATE', mainType, mainCode, [
					'children',
					'someString',
				]),
			);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				2,
				'CREATE',
				matcher('CREATE', childType, childCode, ['code', 'isChildOf']),
			);
		});

		it('should send extra UPDATE events when disconnecting from related nodes', async () => {
			const neo4jResult = mockNeo4jResult({
				type: mainType,
				code: mainCode,
				props: { someString: 'some string' },
			});

			await broadcast('UPDATE', neo4jResult, {
				relationships: {
					removed: { children: [childCode] },
				},
			});
			expect(emitter.emit).toHaveBeenCalledTimes(2);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				1,
				'UPDATE',
				matcher('UPDATE', mainType, mainCode, [
					'children',
					'someString',
				]),
			);
			expect(emitter.emit).toHaveBeenNthCalledWith(
				2,
				'UPDATE',
				matcher('UPDATE', 'ChildType', childCode, ['isChildOf']),
			);
		});
	});
});
