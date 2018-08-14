const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { executeQuery } = require('../../server/lib/db-connection');
const { checkResponse, setupMocks, stubDbTransaction } = require('./helpers');
const lolex = require('lolex');

describe('node performance tuning', () => {
	const relationships = {
		DEPENDS_ON: [...Array(5)]
			.map((val, n) => ({
				direction: 'outgoing',
				nodeType: 'System',
				nodeCode: `new-test-system${n}`
			}))
			.concat([
				{
					direction: 'incoming',
					nodeType: 'System',
					nodeCode: 'new-test-system-dependent'
				},
				{
					direction: 'incoming',
					nodeType: 'Product',
					nodeCode: 'new-test-product'
				}
			]),
		SUPPORTED_BY: [
			{
				direction: 'outgoing',
				nodeType: 'Team',
				nodeCode: 'test-team'
			}
		],
		DELIVERED_BY: [
			{
				direction: 'outgoing',
				nodeType: 'Team',
				nodeCode: 'test-team'
			}
		],
		HAS_REPO: [
			{
				direction: 'outgoing',
				nodeType: 'Repository',
				nodeCode: 'github:test-repo'
			}
		],
		MONITORED_BY: [...Array(5)].map((val, n) => ({
			direction: 'outgoing',
			nodeType: 'Healthcheck',
			nodeCode: `new-test-healthcheck${n}`
		}))
	};

	const relationshipCount = Object.values(relationships).reduce(
		(tally, defs) => tally + defs.length,
		0
	);

	const cleanUp = async () => {
		const allCodes = Object.values(relationships).reduce(
			(allCodes, defs) => allCodes.concat(defs.map(def => def.nodeCode)),
			['new-hub-system']
		);
		return executeQuery(
			`MATCH (n) WHERE n.code IN [${allCodes
				.map(code => `"${code}"`)
				.join(',')}] DETACH DELETE n`
		);
	};

	const state = {};
	setupMocks(state);

	let clock;
	const timestamp = 1528458548930;
	const formattedTimestamp = 'Fri, 08 Jun 2018 11:49:08 GMT';

	before(cleanUp);
	beforeEach(async () => {
		clock = lolex.install({ now: timestamp });
	});

	afterEach(async () => {
		await cleanUp();
		clock = clock.uninstall();
	});

	describe('post', () => {
		it('writes correctly and returns expected data', async () => {
			await request(app)
				.post('/v1/node/System/new-hub-system?upsert=true')
				.auth('create-client-id')
				.set('x-request-id', 'create-request-id')
				.send({
					node: { foo: 'new' },
					relationships
				})
				.expect(200)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							code: 'new-hub-system',
							foo: 'new',
							_createdByClient: 'create-client-id',
							_createdByRequest: 'create-request-id',
							_createdTimestamp: formattedTimestamp,
							_updatedByClient: 'create-client-id',
							_updatedByRequest: 'create-request-id',
							_updatedTimestamp: formattedTimestamp
						},
						relationships
					})
				);
			const result = await executeQuery(
				`MATCH (n:System { code: "new-hub-system" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(relationshipCount);

			const identifiers = state.stubSendEvent.args.map(
				a =>
					`${a[0].code}-${a[0].event}-${a[0].relationship &&
						a[0].relationship.relType +
							a[0].relationship.direction +
							a[0].relationship.nodeCode}`
			);
			const uniqueIdentifiers = [...new Set(identifiers)];
			// testing that each hcange only gets logged once
			expect(state.stubSendEvent.args.length).to.equal(
				uniqueIdentifiers.length
			);
		});

		it('splits writes of many relationships into multiple calls', async () => {
			const dbTransactionStub = stubDbTransaction(state);
			await request(app)
				.post('/v1/node/System/new-hub-system?upsert=true')
				.auth('create-client-id')
				.set('x-request-id', 'create-request-id')
				.send({
					node: { foo: 'new' },
					relationships
				})
				.expect(200);

			expect(dbTransactionStub.args.length).to.equal(3);
			expect(dbTransactionStub.args[0][0]).to.match(/^CREATE/);
			expect(dbTransactionStub.args[1][0]).to.match(/MERGE/);
		});
	});

	describe('patch', () => {
		it('writes correctly and returns expected data', async () => {
			await request(app)
				.patch(
					'/v1/node/System/new-hub-system?upsert=true&relationshipAction=replace'
				)
				.auth('update-client-id')
				.set('x-request-id', 'update-request-id')
				.send({
					node: { foo: 'new' },
					relationships
				})
				.expect(201)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							code: 'new-hub-system',
							foo: 'new',
							_createdByClient: 'update-client-id',
							_createdByRequest: 'update-request-id',
							_createdTimestamp: formattedTimestamp,
							_updatedByClient: 'update-client-id',
							_updatedByRequest: 'update-request-id',
							_updatedTimestamp: formattedTimestamp
						},
						relationships
					})
				);
			const result = await executeQuery(
				`MATCH (n:System { code: "new-hub-system" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(relationshipCount);
		});

		it('splits writes of many relationships into multiple calls', async () => {
			const dbTransactionStub = stubDbTransaction(state, {
				_createdByRequest: 'update-request-id'
			});
			await request(app)
				.patch(
					'/v1/node/System/new-hub-system?upsert=true&relationshipAction=replace'
				)
				.auth('update-client-id')
				.set('x-request-id', 'update-request-id')
				.send({
					node: { foo: 'new' },
					relationships
				})
				.expect(201);

			expect(dbTransactionStub.args.length).to.equal(4);
			expect(dbTransactionStub.args[1][0]).to.match(/^MERGE/);
			expect(dbTransactionStub.args[2][0]).to.match(/MERGE/);
		});
	});
});
