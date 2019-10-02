const express = require('express');
const request = require('supertest');
const { getRestApi } = require('..');
const { setupMocks } = require('../../../test-helpers');

const app = express();

app.use('/route', getRestApi());
const namespace = 'express-get';
const mainCode = `${namespace}-main`;
const restUrl = `/route/MainType/${mainCode}`;

describe('api-rest-express - GET', () => {
	const sandbox = {};
	setupMocks(sandbox, { namespace });

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
		// must pass on metadata etc
		// must respond with whatever the handler returns
		// must respondw with errors accordingly
	});
});
