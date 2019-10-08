jest.mock('../../../packages/api-rest-get-handler', () => {
	const mockHandler = jest.fn();
	return {
		getHandler: jest.fn().mockReturnValue(mockHandler),
		mockHandler,
	};
});
const httpErrors = require('http-errors');
const express = require('express');
const request = require('supertest');
const { setupMocks } = require('../../../test-helpers');
const { getRestApi } = require('..');
const { mockHandler } = require('../../../packages/api-rest-get-handler');

const app = express();

app.use('/route', getRestApi());

const namespace = 'express-get';
const mainCode = `${namespace}-main`;
const restUrl = `/route/MainType/${mainCode}`;

describe('api-rest-express - GET', () => {
	const sandbox = {};
	setupMocks(sandbox, { namespace });
	beforeEach(() =>
		mockHandler.mockResolvedValue({ status: 200, body: { prop: 'value' } }),
	);
	describe('client headers', () => {
		it('GET no client-id or client-user-id returns 400', async () => {
			return request(app)
				.get(restUrl)
				.expect(400);
		});

		it('GET client-id but no client-user-id returns 200', async () => {
			await sandbox.createNode('MainType', mainCode);
			return request(app)
				.get(restUrl)
				.set('client-id', 'test-client-id')
				.expect(200);
		});

		it('GET client-user-id but no client-id returns 200', async () => {
			await sandbox.createNode('MainType', mainCode);
			return request(app)
				.get(restUrl)
				.set('client-user-id', 'test-user-id')
				.expect(200);
		});

		it('GET client-id and client-user-id returns 200', async () => {
			await sandbox.createNode('MainType', mainCode);
			return request(app)
				.get(restUrl)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.expect(200);
		});
	});

	describe('forwarding to handler', () => {
		beforeEach(() => mockHandler.mockReset());

		it('must pass on metadata etc', async () => {
			mockHandler.mockResolvedValue({
				status: 200,
				body: { prop: 'value' },
			});
			await request(app)
				.get(restUrl)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.set('x-request-id', 'test-request-id')
				.expect(200);
			expect(mockHandler).toHaveBeenCalledWith({
				metadata: {
					requestId: 'test-request-id',
					clientId: 'test-client-id',
					clientUserId: 'test-user-id',
				},
				body: {},
				query: {},
				type: 'MainType',
				code: 'express-get-main',
			});
		});
		it('must respond with whatever the handler returns', async () => {
			mockHandler.mockResolvedValue({
				status: 200,
				body: { prop: 'value' },
			});
			await request(app)
				.get(restUrl)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.set('request-id', 'test-request-id')
				.expect(200, { prop: 'value' });
		});
		it('must respond with expected errors accordingly', async () => {
			mockHandler.mockRejectedValue(httpErrors(404, 'hahaha'));
			await request(app)
				.get(restUrl)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.set('request-id', 'test-request-id')
				.expect(404, { errors: [{ message: 'hahaha' }] });
		});
		it('must respond with unexpected errors accordingly', async () => {
			mockHandler.mockRejectedValue(new Error('hahaha'));
			await request(app)
				.get(restUrl)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.set('request-id', 'test-request-id')
				.expect(500, { errors: [{ message: 'Error: hahaha' }] });
		});
	});
});
