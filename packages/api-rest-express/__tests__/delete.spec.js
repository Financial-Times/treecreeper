jest.mock('../../../packages/api-rest-delete-handler', () => {
	const mockHandler = jest.fn();
	return {
		deleteHandler: jest.fn().mockReturnValue(mockHandler),
		mockHandler,
	};
});
const httpErrors = require('http-errors');
const express = require('express');
const request = require('supertest');
const { setupMocks } = require('../../../test-helpers');
const { getRestApi } = require('..');
const { mockHandler } = require('../../../packages/api-rest-delete-handler');

const app = express();

app.use('/route', getRestApi());

const namespace = 'express-delete';
const mainCode = `${namespace}-main`;
const restUrl = `/route/MainType/${mainCode}`;

describe('api-rest-express - delete', () => {
	const { createNode } = setupMocks(namespace);
	beforeEach(() => mockHandler.mockResolvedValue({ status: 204 }));
	describe('client headers', () => {
		it('delete no client-id or client-user-id returns 400', async () => {
			return request(app)
				.delete(restUrl)
				.expect(400);
		});

		it('delete client-id but no client-user-id returns 204', async () => {
			await createNode('MainType', mainCode);
			return request(app)
				.delete(restUrl)
				.set('client-id', 'test-client-id')
				.expect(204);
		});

		it('delete client-user-id but no client-id returns 204', async () => {
			await createNode('MainType', mainCode);
			return request(app)
				.delete(restUrl)
				.set('client-user-id', 'test-user-id')
				.expect(204);
		});

		it('delete client-id and client-user-id returns 204', async () => {
			await createNode('MainType', mainCode);
			return request(app)
				.delete(restUrl)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.expect(204);
		});
	});

	describe('forwarding to handler', () => {
		beforeEach(() => mockHandler.mockReset());

		it('must pass on metadata etc', async () => {
			mockHandler.mockResolvedValue({
				status: 204,
				body: { prop: 'value' },
			});
			await request(app)
				.delete(restUrl)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.set('x-request-id', 'test-request-id')
				.expect(204);
			expect(mockHandler).toHaveBeenCalledWith({
				metadata: {
					requestId: 'test-request-id',
					clientId: 'test-client-id',
					clientUserId: 'test-user-id',
				},
				body: {},
				query: {},
				type: 'MainType',
				code: 'express-delete-main',
			});
		});
		it('must respond with whatever the handler returns', async () => {
			mockHandler.mockResolvedValue({
				status: 204,
			});
			await request(app)
				.delete(restUrl)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.set('request-id', 'test-request-id')
				.expect(204);
		});
		it('must respond with expected errors accordingly', async () => {
			mockHandler.mockRejectedValue(httpErrors(404, 'hahaha'));
			await request(app)
				.delete(restUrl)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.set('request-id', 'test-request-id')
				.expect(404, { errors: [{ message: 'hahaha' }] });
		});
		it('must respond with unexpected errors accordingly', async () => {
			mockHandler.mockRejectedValue(new Error('hahaha'));
			await request(app)
				.delete(restUrl)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.set('request-id', 'test-request-id')
				.expect(500, { errors: [{ message: 'Error: hahaha' }] });
		});
	});
});
