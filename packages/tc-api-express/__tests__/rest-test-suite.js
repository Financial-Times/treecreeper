const defaultHandler = () => () => null;
const httpErrors = require('http-errors');
// eslint-disable-next-line import/no-extraneous-dependencies
const request = require('supertest');
const { setupMocks } = require('../../../test-helpers');

const testSuite = (method, goodStatus) => {
	describe(`api-express - ${method}`, () => {
		const mockHandler = jest.fn();
		const mockHandlerFactory = jest.fn();
		const config = { fake: 'config' };
		let app;
		beforeAll(async () => {
			jest.doMock('@financial-times/tc-api-rest-handlers', () => {
				return {
					headHandler:
						method === 'head'
							? mockHandlerFactory.mockReturnValue(mockHandler)
							: defaultHandler,
					getHandler:
						method === 'get'
							? mockHandlerFactory.mockReturnValue(mockHandler)
							: defaultHandler,
					deleteHandler:
						method === 'delete'
							? mockHandlerFactory.mockReturnValue(mockHandler)
							: defaultHandler,
					postHandler:
						method === 'post'
							? mockHandlerFactory.mockReturnValue(mockHandler)
							: defaultHandler,
					patchHandler:
						method === 'patch'
							? mockHandlerFactory.mockReturnValue(mockHandler)
							: defaultHandler,
					absorbHandler:
						method === 'absorb'
							? mockHandlerFactory.mockReturnValue(mockHandler)
							: defaultHandler,
				};
			});
			const { getApp } = require('..');

			app = await getApp(config);
		});

		afterAll(() => jest.dontMock('@financial-times/tc-api-rest-handlers'));

		const namespace = `api-express-${method}`;
		const mainCode = `${namespace}-main`;
		const otherCode = `${namespace}-other`;
		const restUrl =
			method === 'absorb'
				? // although upsert doesn't apply to absorb, it is used to test for
				  // passing query string to handlers
				  `/rest/MainType/${mainCode}/absorb/${otherCode}?upsert=yes`
				: `/rest/MainType/${mainCode}?upsert=yes`;
		const useBody = ['post', 'patch'].includes(method);
		const { createNode } = setupMocks(namespace);
		// overwrite method to post is method is absorb
		const getRequestMethod = () => (method === 'absorb' ? 'post' : method);

		beforeEach(() => mockHandler.mockResolvedValue({ status: goodStatus }));
		it('passes config to the handler factory', () => {
			expect(mockHandlerFactory).toHaveBeenCalledWith(config);
		});

		describe('client headers', () => {
			it(`no client-id or client-user-id returns 400`, async () => {
				return request(app)
					[getRequestMethod()](restUrl)
					.expect(400);
			});

			it(`client-id but no client-user-id returns ${goodStatus}`, async () => {
				await createNode('MainType', mainCode);
				return request(app)
					[getRequestMethod()](restUrl)
					.set('client-id', 'test-client-id')
					.expect(goodStatus);
			});

			it(`client-user-id but no client-id returns ${goodStatus}`, async () => {
				await createNode('MainType', mainCode);
				return request(app)
					[getRequestMethod()](restUrl)
					.set('client-user-id', 'test-user-id')
					.expect(goodStatus);
			});

			it(`client-id and client-user-id returns ${goodStatus}`, async () => {
				await createNode('MainType', mainCode);
				return request(app)
					[getRequestMethod()](restUrl)
					.set('client-id', 'test-client-id')
					.set('client-user-id', 'test-user-id')
					.expect(goodStatus);
			});
		});

		describe('forwarding to handler', () => {
			beforeEach(() => mockHandler.mockReset());

			it('must pass on metadata etc', async () => {
				mockHandler.mockResolvedValue({
					status: goodStatus,
					body: { prop: 'value' },
				});
				let req = request(app)
					[getRequestMethod()](restUrl)
					.set('client-id', 'test-client-id')
					.set('client-user-id', 'test-user-id')
					.set('x-request-id', 'test-request-id');

				if (useBody) {
					req = req.send({ property: 'value' });
				}

				await req.expect(goodStatus);
				const expectedHandlerArgs = {
					metadata: {
						requestId: 'test-request-id',
						clientId: 'test-client-id',
						clientUserId: 'test-user-id',
					},
					body: useBody ? { property: 'value' } : {},
					query: { upsert: 'yes' },
					type: 'MainType',
					code: mainCode,
				};
				expect(mockHandler).toHaveBeenCalledWith(
					method === 'absorb'
						? { ...expectedHandlerArgs, codeToAbsorb: otherCode }
						: expectedHandlerArgs,
				);
			});
			it('must respond with whatever the handler returns', async () => {
				mockHandler.mockResolvedValue({
					status: goodStatus,
				});
				await request(app)
					[getRequestMethod()](restUrl)
					.set('client-id', 'test-client-id')
					.set('client-user-id', 'test-user-id')
					.set('request-id', 'test-request-id')
					.expect(goodStatus);
			});

			const expectError = (status, message) =>
				method === 'head' ? [status] : [status, message];

			it('must respond with expected errors accordingly', async () => {
				mockHandler.mockRejectedValue(httpErrors(404, 'hahaha'));
				await request(app)
					[getRequestMethod()](restUrl)
					.set('client-id', 'test-client-id')
					.set('client-user-id', 'test-user-id')
					.set('request-id', 'test-request-id')
					.expect(
						...expectError(404, {
							errors: [{ message: 'hahaha' }],
						}),
					);
			});
			it('must respond with unexpected errors accordingly', async () => {
				mockHandler.mockRejectedValue(new Error('hahaha'));
				await request(app)
					[getRequestMethod()](restUrl)
					.set('client-id', 'test-client-id')
					.set('client-user-id', 'test-user-id')
					.set('request-id', 'test-request-id')
					.expect(
						...expectError(500, {
							errors: [{ message: 'Error: hahaha' }],
						}),
					);
			});
		});
	});
};

module.exports = { testSuite };
