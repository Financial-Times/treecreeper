/*eslint-disable*/
const logger = require('@financial-times/n-logger').default;
const sinon = require('sinon');
const { expect, assert } = require('chai');
const request = require('./helpers/supertest');
const app = require('../server/app.js');
const { session: db } = require('../server/db-connection');
const EventLogWriter = require('../server/lib/event-log-writer');

describe('crud', () => {
	let sandbox;
	let stubSendEvent;

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		stubSendEvent = sandbox
			.stub(EventLogWriter.prototype, 'sendEvent')
			.callsFake(data => {
				logger.debug('Event log stub sendEvent called', { event: data.event });
				return Promise.resolve();
			});
	});

	afterEach(() => {
		sandbox.restore();
	});

	describe('GET generic', () => {
		let nodes;

		beforeEach(async () => {
			nodes = [{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }];
			for (const node of nodes) {
				const deleteQuery = `MATCH (a:SomeNodeType { SomeUniqueAttr: "${
					node.SomeUniqueAttr
				}" }) DETACH DELETE a`;
				await db.run(deleteQuery);
			}
			const createQuery = 'CREATE (a:SomeNodeType $node) RETURN a';
			for (const node of nodes) {
				await db.run(createQuery, { node: node });
			}
		});

		afterEach(async () => {
			for (const node of nodes) {
				const deleteQuery = `MATCH (a:SomeNodeType { SomeUniqueAttr: "${
					node.SomeUniqueAttr
				}" }) DETACH DELETE a`;
				await db.run(deleteQuery);
			}
			nodes = null;
		});

		it('GET with unique attribute returns the node', () => {
			return request(app)
				.get('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(200, [nodes[0]]);
		});

		it('GET without unique attribute returns all the nodes', () => {
			request(app)
				.get('/api/SomeNodeType/')
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(200, nodes);
		});

		it('GET one for unknown unique attribute returns 404', () => {
			request(app)
				.get('/api/SomeNodeType/SomeUniqueAttr/JonathanTaylorThomas')
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(404, 'SomeNodeType JonathanTaylorThomas not found');
		});

		it('GET no api_key returns 400', () => {
			request(app)
				.get('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.expect(400);
		});

		it('GET when specified with a relationships param will include related nodes - but none for this node', () => {
			return request(app)
				.get(
					'/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/relationships'
				)
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(404, {});
		});

		it('GET when specified with a relationships param will include related nodes - one for this node', async () => {
			const expectedNodes = [
				{
					SomeUniqueAttr: 'SomeUniqueAttrValue',
					foo: 'bar',
					relationships: [
						{
							name: 'TestRelationship',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							to: 'TestNode',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'testing'
						}
					]
				}
			];
			const addNodeQuery = `CREATE (t:TestNode {id:'testing'})`;
			const addNodeResult = await db.run(addNodeQuery);
			const addRelQuery = `MERGE (n:SomeNodeType {SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'})-[r:TestRelationship]->(t:TestNode {id:'testing'}) RETURN r`;
			const addRelResult = await db.run(addRelQuery);
			return request(app)
				.get(
					'/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/relationships'
				)
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(200, expectedNodes)
				.then(async response => {
					const delRelQuery = `MATCH (t:TestNode {id:'testing'}) DETACH DELETE t`;
					await db.run(delRelQuery);
				});
		});
	});

	describe('POST generic', () => {
		let originalNode;
		let correctNode;

		beforeEach(async () => {
			originalNode = { SomeUniqueAttr: 'Oops', foo: 'bar' };
			correctNode = { SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' };
		});

		afterEach(async () => {
			const deleteQuery = 'MATCH (a:SomeNodeType) DETACH DELETE a';
			await db.run(deleteQuery);
			originalNode = null;
			correctNode = null;
		});

		it('POST inserts the node with correct unique attribute', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];
			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({ node: originalNode })
				.expect(200, correctNode)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('POST sends a single created event when no relationships are specified', async () => {
			const uniqueAttributeValue = 'SomeUniqueAttrValue';
			const uniqueAttributeName = 'SomeUniqueAttr';
			const nodeType = 'SomeNodeType';
			const expectedNodes = [
				{ [uniqueAttributeName]: uniqueAttributeValue, foo: 'bar' }
			];
			return request(app)
				.post(`/api/${nodeType}/${uniqueAttributeName}/${uniqueAttributeValue}`)
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({ node: originalNode })
				.then(async response => {
					expect(stubSendEvent).to.have.been.calledOnce;
					expect(stubSendEvent).to.have.been.calledWithExactly({
						action: EventLogWriter.actions.CREATE,
						code: uniqueAttributeValue,
						event: 'CREATED_NODE',
						type: nodeType
					});
				});
		});

		it('POST inserts the node and links it to related node if it exists', async () => {
			const expectedNodes = [
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue' },
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];
			const relationship = {
				name: 'REL',
				from: 'SomeNodeType',
				fromUniqueAttrName: 'SomeUniqueAttr',
				fromUniqueAttrValue: 'SomeUniqueAttrValue',
				toUniqueAttrName: 'OtherUniqueAttrName',
				toUniqueAttrValue: 'OtherUniqueAttrValue',
				to: 'SomeNodeType'
			};

			const createTargetNode =
				'CREATE (a:SomeNodeType {OtherUniqueAttrName: "OtherUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode);

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: [relationship]
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					assert.equal(body[0].type, relationship.name);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it('POST inserts the node and links it to multiple related nodes if they all exist', async () => {
			const expectedNodes = [
				{ OneUniqueAttrName: 'OneUniqueAttrValue' },
				{ TwoUniqueAttrName: 'TwoUniqueAttrValue' },
				{ ThreeUniqueAttrName: 'ThreeUniqueAttrValue' },
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];

			const relationships = [
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OneUniqueAttrName',
					toUniqueAttrValue: 'OneUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'TwoUniqueAttrName',
					toUniqueAttrValue: 'TwoUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'ThreeUniqueAttrName',
					toUniqueAttrValue: 'ThreeUniqueAttrValue',
					to: 'SomeNodeType'
				}
			];

			const createTargetNode1 =
				'CREATE (a:SomeNodeType {OneUniqueAttrName: "OneUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode1);
			const createTargetNode2 =
				'CREATE (a:SomeNodeType {TwoUniqueAttrName: "TwoUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode2);
			const createTargetNode3 =
				'CREATE (a:SomeNodeType {ThreeUniqueAttrName: "ThreeUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode3);

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: relationships
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it('POST inserts the node and links multiple relations to a single existing multiple-related node', async () => {
			const expectedNodes = [
				{ SingleRelationUniqueAttrName: 'SingleRelationUniqueAttrValue' },
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue' },
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];

			const relationships = [
				{
					name: 'REL1',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL2',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL3',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'SingleRelationUniqueAttrName',
					toUniqueAttrValue: 'SingleRelationUniqueAttrValue',
					to: 'SomeNodeType'
				}
			];

			const createTargetNodes =
				'UNWIND {props} as map CREATE(n:SomeNodeType) SET n = map';
			await db.run(createTargetNodes, {
				props: [
					{
						SingleRelationUniqueAttrName: 'SingleRelationUniqueAttrValue'
					},
					{
						OtherUniqueAttrName: 'OtherUniqueAttrValue'
					}
				]
			});

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: relationships
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it('POST sends an event log for a node created event, and one for each direction of the relationship created between nodes with both single and multi relations', async () => {
			const expectedNodes = [
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue' },
				{ SingleRelationUniqueAttrName: 'SingleRelationUniqueAttrValue' },
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];

			const relationships = [
				{
					name: 'REL1',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL2',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL3',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'SingleRelationUniqueAttrName',
					toUniqueAttrValue: 'SingleRelationUniqueAttrValue',
					to: 'SomeNodeType'
				}
			];

			const createTargetNodes =
				'UNWIND {props} as map CREATE(n:SomeNodeType) SET n = map';
			await db.run(createTargetNodes, {
				props: [
					{
						SingleRelationUniqueAttrName: 'SingleRelationUniqueAttrValue'
					},
					{
						OtherUniqueAttrName: 'OtherUniqueAttrValue'
					}
				]
			});
			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: relationships
				})
				.then(async response => {
					expect(stubSendEvent).to.have.callCount(7);
					expect(
						stubSendEvent.getCalls().map(({ args }) => args[0])
					).to.have.deep.members([
						{
							action: EventLogWriter.actions.CREATE,
							code: 'SomeUniqueAttrValue',
							event: 'CREATED_NODE',
							type: 'SomeNodeType'
						},
						{
							action: EventLogWriter.actions.UPDATE,
							code: 'SomeUniqueAttrValue',
							event: 'CREATED_RELATIONSHIP',
							relationship: {
								direction: 'to',
								relatedCode: 'OtherUniqueAttrValue',
								relatedType: 'SomeNodeType',
								type: 'REL1'
							},
							type: 'SomeNodeType'
						},
						{
							action: EventLogWriter.actions.UPDATE,
							code: 'OtherUniqueAttrValue',
							event: 'CREATED_RELATIONSHIP',
							relationship: {
								direction: 'from',
								relatedCode: 'SomeUniqueAttrValue',
								relatedType: 'SomeNodeType',
								type: 'REL1'
							},
							type: 'SomeNodeType'
						},
						{
							action: EventLogWriter.actions.UPDATE,
							code: 'SomeUniqueAttrValue',
							event: 'CREATED_RELATIONSHIP',
							relationship: {
								direction: 'to',
								relatedCode: 'OtherUniqueAttrValue',
								relatedType: 'SomeNodeType',
								type: 'REL2'
							},
							type: 'SomeNodeType'
						},
						{
							action: EventLogWriter.actions.UPDATE,
							code: 'OtherUniqueAttrValue',
							event: 'CREATED_RELATIONSHIP',
							relationship: {
								direction: 'from',
								relatedCode: 'SomeUniqueAttrValue',
								relatedType: 'SomeNodeType',
								type: 'REL2'
							},
							type: 'SomeNodeType'
						},
						{
							action: EventLogWriter.actions.UPDATE,
							code: 'SomeUniqueAttrValue',
							event: 'CREATED_RELATIONSHIP',
							relationship: {
								direction: 'to',
								relatedCode: 'SingleRelationUniqueAttrValue',
								relatedType: 'SomeNodeType',
								type: 'REL3'
							},
							type: 'SomeNodeType'
						},
						{
							action: EventLogWriter.actions.UPDATE,
							code: 'SingleRelationUniqueAttrValue',
							event: 'CREATED_RELATIONSHIP',
							relationship: {
								direction: 'from',
								relatedCode: 'SomeUniqueAttrValue',
								relatedType: 'SomeNodeType',
								type: 'REL3'
							},
							type: 'SomeNodeType'
						}
					]);
				});
		});

		it('POST fails if the related node does not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: [
						{
							name: 'REL',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent',
							to: 'SomeNodeType'
						}
					]
				})
				.expect(400)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('POST fails if multiple related nodes do not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: [
						{
							name: 'REL',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent1',
							to: 'SomeNodeType'
						},
						{
							name: 'REL',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent2',
							to: 'SomeNodeType'
						},
						{
							name: 'REL',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent3',
							to: 'SomeNodeType'
						}
					]
				})
				.expect(400)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('POST fails if single multiple-related node does not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];
			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: [
						{
							name: 'REL1',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent',
							to: 'SomeNodeType'
						},
						{
							name: 'REL2',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent',
							to: 'SomeNodeType'
						},
						{
							name: 'REL3',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent',
							to: 'SomeNodeType'
						}
					]
				})
				.expect(400)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('POST inserts the node and links it to a related node that does not exist if using upsert', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue' }
			];

			const relationship = {
				name: 'REL',
				from: 'SomeNodeType',
				fromUniqueAttrName: 'SomeUniqueAttr',
				fromUniqueAttrValue: 'SomeUniqueAttrValue',
				toUniqueAttrName: 'OtherUniqueAttrName',
				toUniqueAttrValue: 'OtherUniqueAttrValue',
				to: 'SomeNodeType'
			};

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/upsert')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: [relationship]
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					assert.equal(body[0].type, relationship.name);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it('POST inserts the node and links it to multple related nodes that do not exist if using upsert', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OneUniqueAttrName: 'OneUniqueAttrValue' },
				{ TwoUniqueAttrName: 'TwoUniqueAttrValue' },
				{ ThreeUniqueAttrName: 'ThreeUniqueAttrValue' }
			];

			const relationships = [
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OneUniqueAttrName',
					toUniqueAttrValue: 'OneUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'TwoUniqueAttrName',
					toUniqueAttrValue: 'TwoUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'ThreeUniqueAttrName',
					toUniqueAttrValue: 'ThreeUniqueAttrValue',
					to: 'SomeNodeType'
				}
			];

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/upsert')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: relationships
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it('POST inserts the node and links it to a single multiple-related node that does not exist if using upsert', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue' }
			];

			const relationships = [
				{
					name: 'REL1',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL2',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL3',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				}
			];

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/upsert')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: relationships
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it('POST creating duplicate node returns 400', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];

			const duplicateNode = {
				SomeUniqueAttr: 'SomeUniqueAttrValue',
				foo: 'bar'
			};
			const createQuery = 'CREATE (a:SomeNodeType $node) RETURN a';
			await db.run(createQuery, { node: duplicateNode });

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.send({ node: originalNode })
				.expect(400)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		// @@ another test that proves a POST doesn't return 400 if you use upsert since it will be overwritten? @@

		it('POST no api_key returns 400', () => {
			const expectedNodes = [];

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.send({ node: originalNode })
				.expect(400)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(404, expectedNodes);
				});
		});
	});

	describe('PUT generic', () => {
		let node;
		let modifiedNode;
		let modification;

		beforeEach(async () => {
			node = { SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' };
			modification = { potato: 'potah-to' };
			modifiedNode = {
				SomeUniqueAttr: 'SomeUniqueAttrValue',
				foo: 'bar',
				potato: 'potah-to'
			};
			const createQuery = 'CREATE (a:SomeNodeType $node) RETURN a';
			await db.run(createQuery, { node: node });
		});

		afterEach(async () => {
			const deleteQuery = 'MATCH (a:SomeNodeType) DETACH DELETE a';
			await db.run(deleteQuery);

			node = null;
			modifiedNode = null;
			modification = null;
		});

		it('PUT modifies an existing node', () => {
			const expectedNodes = [
				{
					SomeUniqueAttr: 'SomeUniqueAttrValue',
					foo: 'bar',
					potato: 'potah-to'
				}
			];
			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({ node: modification })
				.expect(200, modifiedNode)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT returns 200 even if props updated with the same value they had before', () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];
			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({ node })
				.expect(200, node)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT sends an event log event that the node was updated', () => {
			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({ node })
				.expect(() => {
					expect(stubSendEvent).to.have.been.calledOnce;
					expect(stubSendEvent).to.have.been.calledWithExactly({
						action: EventLogWriter.actions.UPDATE,
						code: 'SomeUniqueAttrValue',
						event: 'UPDATED_NODE',
						type: 'SomeNodeType'
					});
				});
		});

		it("PUT for a node that doesn't exist returns 404", () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/NonExistent')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({ node })
				.expect(404)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it("PUT for a node that doesn't exist does not send an event log event", () => {
			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/NonExistent')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({ node })
				.expect(() => {
					expect(stubSendEvent).to.have.not.been.called;
				});
		});

		it("PUT with upsert creates a node if it doesn't exist", () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ SomeUniqueAttr: 'NonExistent', foo: 'bar' }
			];

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/NonExistent/upsert')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({ node })
				.expect(200)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it("PUT with upsert sends an event log event that the node was created if it doesn't exist", () => {
			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/NonExistent/upsert')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({ node })
				.expect(() => {
					expect(stubSendEvent).to.have.been.calledOnce;
					expect(stubSendEvent).to.have.been.calledWithExactly({
						action: EventLogWriter.actions.CREATE,
						code: 'NonExistent',
						event: 'CREATED_NODE',
						type: 'SomeNodeType'
					});
				});
		});

		it('PUT updates the node if it exists, and links it to a related node if it exists', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue' }
			];

			const relationship = {
				name: 'REL',
				from: 'SomeNodeType',
				fromUniqueAttrName: 'SomeUniqueAttr',
				fromUniqueAttrValue: 'SomeUniqueAttrValue',
				toUniqueAttrName: 'OtherUniqueAttrName',
				toUniqueAttrValue: 'OtherUniqueAttrValue',
				to: 'SomeNodeType'
			};

			const createTargetNode =
				'CREATE (a:SomeNodeType {OtherUniqueAttrName: "OtherUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode);

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: [relationship]
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					assert.equal(body[0].type, relationship.name);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it('PUT updates the node if it exists, and links it to multiple related nodes if they exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OneUniqueAttrName: 'OneUniqueAttrValue' },
				{ TwoUniqueAttrName: 'TwoUniqueAttrValue' },
				{ ThreeUniqueAttrName: 'ThreeUniqueAttrValue' }
			];

			const relationships = [
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OneUniqueAttrName',
					toUniqueAttrValue: 'OneUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'TwoUniqueAttrName',
					toUniqueAttrValue: 'TwoUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'ThreeUniqueAttrName',
					toUniqueAttrValue: 'ThreeUniqueAttrValue',
					to: 'SomeNodeType'
				}
			];

			const createTargetNode1 =
				'CREATE (a:SomeNodeType {OneUniqueAttrName: "OneUniqueAttrValue"}) RETURN a';
			const createTargetNode2 =
				'CREATE (a:SomeNodeType {TwoUniqueAttrName: "TwoUniqueAttrValue"}) RETURN a';
			const createTargetNode3 =
				'CREATE (a:SomeNodeType {ThreeUniqueAttrName: "ThreeUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode1);
			await db.run(createTargetNode2);
			await db.run(createTargetNode3);

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: relationships
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it('PUT updates the node if it exists, and links it to a single multiple-related node it exists', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue' }
			];

			const relationships = [
				{
					name: 'REL1',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL2',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL3',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				}
			];

			const createTargetNode =
				'CREATE (a:SomeNodeType {OtherUniqueAttrName: "OtherUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode);

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: relationships
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it('PUT creates the given node, but returns a 400 if the related node does not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: [
						{
							name: 'REL',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent',
							to: 'SomeNodeType'
						}
					]
				})
				.expect(400)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT only sends an UPDATED_NODE event log event if the related node does not exist', async () => {
			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: [
						{
							name: 'REL',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent',
							to: 'SomeNodeType'
						}
					]
				})
				.expect(() => {
					expect(stubSendEvent).to.have.been.calledOnce;
					expect(stubSendEvent).to.have.been.calledWithExactly({
						action: EventLogWriter.actions.UPDATE,
						code: 'SomeUniqueAttrValue',
						event: 'UPDATED_NODE',
						type: 'SomeNodeType'
					});
				});
		});

		it('PUT fails if the multiple related nodes do not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: [
						{
							name: 'REL',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent1',
							to: 'SomeNodeType'
						},
						{
							name: 'REL',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent2',
							to: 'SomeNodeType'
						},
						{
							name: 'REL',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent3',
							to: 'SomeNodeType'
						}
					]
				})
				.expect(400)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT fails if the single multiple-related node does not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }
			];

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: [
						{
							name: 'REL1',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent',
							to: 'SomeNodeType'
						},
						{
							name: 'REL2',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent',
							to: 'SomeNodeType'
						},
						{
							name: 'REL3',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent',
							to: 'SomeNodeType'
						}
					]
				})
				.expect(400)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it("PUT creates the node if it doesn't exist, and links it to a related node even if it does not exist, with upsert", async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue' }
			];

			const relationship = {
				name: 'REL',
				from: 'SomeNodeType',
				fromUniqueAttrName: 'SomeUniqueAttr',
				fromUniqueAttrValue: 'SomeUniqueAttrValue',
				toUniqueAttrName: 'OtherUniqueAttrName',
				toUniqueAttrValue: 'OtherUniqueAttrValue',
				to: 'SomeNodeType'
			};

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/upsert')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: [relationship]
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					assert.equal(body[0].type, relationship.name);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it("PUT creates the node if it doesn't exist, and links it to multiple related node even if they do not exist, with upsert", async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OneUniqueAttrName: 'OneUniqueAttrValue' },
				{ TwoUniqueAttrName: 'TwoUniqueAttrValue' },
				{ ThreeUniqueAttrName: 'ThreeUniqueAttrValue' }
			];

			const relationships = [
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OneUniqueAttrName',
					toUniqueAttrValue: 'OneUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'TwoUniqueAttrName',
					toUniqueAttrValue: 'TwoUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'ThreeUniqueAttrName',
					toUniqueAttrValue: 'ThreeUniqueAttrValue',
					to: 'SomeNodeType'
				}
			];

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/upsert')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: relationships
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it('PUT sends an event log event for each created node, and each side of any created relationships', async () => {
			const relationships = [
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OneUniqueAttrName',
					toUniqueAttrValue: 'OneUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'TwoUniqueAttrName',
					toUniqueAttrValue: 'TwoUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'ThreeUniqueAttrName',
					toUniqueAttrValue: 'ThreeUniqueAttrValue',
					to: 'SomeNodeType'
				}
			];

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/upsert')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: relationships
				})
				.expect(() => {
					expect(stubSendEvent).to.have.callCount(10);
					expect(
						stubSendEvent.getCalls().map(({ args }) => args[0])
					).to.have.deep.members([
						{
							event: 'UPDATED_NODE',
							action: EventLogWriter.actions.UPDATE,
							code: 'SomeUniqueAttrValue',
							type: 'SomeNodeType'
						},
						{
							event: 'CREATED_NODE',
							action: EventLogWriter.actions.CREATE,
							code: 'OneUniqueAttrName',
							type: 'SomeNodeType'
						},
						{
							event: 'CREATED_RELATIONSHIP',
							action: EventLogWriter.actions.UPDATE,
							relationship: {
								type: 'REL',
								direction: 'to',
								relatedCode: 'OneUniqueAttrValue',
								relatedType: 'SomeNodeType'
							},
							code: 'SomeUniqueAttrValue',
							type: 'SomeNodeType'
						},
						{
							event: 'CREATED_RELATIONSHIP',
							action: EventLogWriter.actions.UPDATE,
							relationship: {
								type: 'REL',
								direction: 'from',
								relatedCode: 'SomeUniqueAttrValue',
								relatedType: 'SomeNodeType'
							},
							code: 'OneUniqueAttrValue',
							type: 'SomeNodeType'
						},
						{
							event: 'CREATED_NODE',
							action: EventLogWriter.actions.CREATE,
							code: 'TwoUniqueAttrName',
							type: 'SomeNodeType'
						},
						{
							event: 'CREATED_RELATIONSHIP',
							action: EventLogWriter.actions.UPDATE,
							relationship: {
								type: 'REL',
								direction: 'to',
								relatedCode: 'TwoUniqueAttrValue',
								relatedType: 'SomeNodeType'
							},
							code: 'SomeUniqueAttrValue',
							type: 'SomeNodeType'
						},
						{
							event: 'CREATED_RELATIONSHIP',
							action: EventLogWriter.actions.UPDATE,
							relationship: {
								type: 'REL',
								direction: 'from',
								relatedCode: 'SomeUniqueAttrValue',
								relatedType: 'SomeNodeType'
							},
							code: 'TwoUniqueAttrValue',
							type: 'SomeNodeType'
						},
						{
							event: 'CREATED_NODE',
							action: EventLogWriter.actions.CREATE,
							code: 'ThreeUniqueAttrName',
							type: 'SomeNodeType'
						},
						{
							event: 'CREATED_RELATIONSHIP',
							action: EventLogWriter.actions.UPDATE,
							relationship: {
								type: 'REL',
								direction: 'to',
								relatedCode: 'ThreeUniqueAttrValue',
								relatedType: 'SomeNodeType'
							},
							code: 'SomeUniqueAttrValue',
							type: 'SomeNodeType'
						},
						{
							event: 'CREATED_RELATIONSHIP',
							action: EventLogWriter.actions.UPDATE,
							relationship: {
								type: 'REL',
								direction: 'from',
								relatedCode: 'SomeUniqueAttrValue',
								relatedType: 'SomeNodeType'
							},
							code: 'ThreeUniqueAttrValue',
							type: 'SomeNodeType'
						}
					]);
				});
		});

		it("PUT creates the node if it doesn't exist, and links it to a single multiple-related node even it does not exist, with upsert", async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue' }
			];

			const relationships = [
				{
					name: 'REL1',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL2',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name: 'REL3',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				}
			];

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/upsert')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: relationships
				})
				.expect(200)
				.then(async response => {
					const body = response.body;
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});
	});

	describe('DELETE generic', () => {
		const nodeType = 'SomeNodeType';
		let nodes;

		beforeEach(async () => {
			nodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ SomeUniqueAttr: 'OtherUniqueAttrValue', lorem: 'ipsum' },
				{ SomeUniqueAttr: 'ThirdUniqueAttrValue', a: 'b' }
			];
			const createQuery = `CREATE (a:${nodeType} $node) RETURN a`;
			for (const node of nodes) {
				await db.run(createQuery, { node: node });
			}
		});

		afterEach(async () => {
			for (const node of nodes) {
				const deleteQuery = `MATCH (a:${nodeType} { SomeUniqueAttr: "${
					node.SomeUniqueAttr
				}" }) DETACH DELETE a`;
				await db.run(deleteQuery);
			}
			nodes = null;
		});

		it('DELETE with a unique attribute deletes the node', () => {
			const expectedNodes = nodes.slice(1);

			return request(app)
				.delete(`/api/${nodeType}/SomeUniqueAttr/${nodes[0].SomeUniqueAttr}`)
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(200, 'SomeUniqueAttrValue deleted')
				.then(async response => {
					return request(app)
						.get(`/api/${nodeType}/`)
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it("DELETE with unique attribute does not delete the given if it has existing relationships and mode != 'detach'", async () => {
			const addRelationshipsQuery = `
				MATCH (n:${nodeType} {SomeUniqueAttr: "${nodes[0].SomeUniqueAttr}"})
				MATCH (t:${nodeType} {SomeUniqueAttr: "${nodes[1].SomeUniqueAttr}"})
				CREATE (n)<-[r:TestRelationship]-(t)
				RETURN r`;
			await db.run(addRelationshipsQuery);

			return request(app)
				.delete(`/api/${nodeType}/SomeUniqueAttr/${nodes[0].SomeUniqueAttr}`)
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(400);
		});

		it("DELETE with unique attribute should not send an event log if existing relationships prevented deletion when mode != 'detach'", async () => {
			const addRelationshipsQuery = `
				MATCH (n:${nodeType} {SomeUniqueAttr: "${nodes[0].SomeUniqueAttr}"})
				MATCH (t:${nodeType} {SomeUniqueAttr: "${nodes[1].SomeUniqueAttr}"})
				CREATE (n)<-[r:TestRelationship]-(t)
				RETURN r`;
			await db.run(addRelationshipsQuery);

			return request(app)
				.delete(`/api/${nodeType}/SomeUniqueAttr/${nodes[0].SomeUniqueAttr}`)
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(() => {
					expect(stubSendEvent).to.have.not.been.called;
				});
		});

		it('DELETE with unique attribute sends an event log event with the deleted node', () => {
			return request(app)
				.delete(`/api/${nodeType}/SomeUniqueAttr/${nodes[0].SomeUniqueAttr}`)
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(() => {
					expect(stubSendEvent).to.have.been.calledOnce;
					expect(stubSendEvent).to.have.been.calledWithExactly({
						action: EventLogWriter.actions.DELETE,
						code: nodes[0].SomeUniqueAttr,
						event: 'DELETED_NODE',
						type: nodeType
					});
				});
		});

		it('DELETE mode=detach with unique attribute sends an event log event for the deleted node and for each end of the deleted relationships', async () => {
			const addRelationshipsQuery = `
				MATCH (n:${nodeType} {SomeUniqueAttr: "${nodes[0].SomeUniqueAttr}"})
				MATCH (t1:${nodeType} {SomeUniqueAttr: "${nodes[1].SomeUniqueAttr}"})
				MATCH (t2:${nodeType} {SomeUniqueAttr: "${nodes[2].SomeUniqueAttr}"})
				CREATE (n)<-[r1:TestRelationship]-(t1)
				CREATE (n)-[r2:TestRelationship]->(t2)
				RETURN r1, r2`;
			await db.run(addRelationshipsQuery);

			return request(app)
				.delete(`/api/${nodeType}/SomeUniqueAttr/${nodes[0].SomeUniqueAttr}`)
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					mode: 'detach'
				})
				.expect(200)
				.then(async response => {
					return request(app)
						.get(`/api/${nodeType}/`)
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.expect(() => {
							expect(stubSendEvent).to.have.been.calledThrice;
							expect(
								stubSendEvent.getCalls().map(({ args }) => args[0])
							).to.deep.equal([
								{
									event: 'DELETED_RELATIONSHIP',
									action: EventLogWriter.actions.UPDATE,
									relationship: {
										type: 'TestRelationship',
										direction: 'from',
										relatedCode: 'SomeUniqueAttrValue',
										relatedType: 'SomeNodeType'
									},
									code: 'ThirdUniqueAttrValue',
									type: 'SomeNodeType'
								},
								{
									event: 'DELETED_RELATIONSHIP',
									action: EventLogWriter.actions.UPDATE,
									relationship: {
										type: 'TestRelationship',
										direction: 'to',
										relatedCode: 'SomeUniqueAttrValue',
										relatedType: 'SomeNodeType'
									},
									code: 'OtherUniqueAttrValue',
									type: 'SomeNodeType'
								},
								{
									event: 'DELETED_NODE',
									action: EventLogWriter.actions.DELETE,
									code: 'SomeUniqueAttrValue',
									type: 'SomeNodeType'
								}
							]);
						});
				});
		});

		it('DELETE returns 404 when trying to delete a non-existent id', () => {
			const givenNonExistentId = 'foo-undefined';
			const expectedNodes = nodes.slice(0);

			return request(app)
				.delete(`/api/${nodeType}/SomeUniqueAttr/${givenNonExistentId}`)
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(404, `${givenNonExistentId} not found. No nodes deleted.`)
				.then(async response => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200)
						.then(({body}) => expect(body).to.have.deep.members(expectedNodes));
				});
		});

		it('DELETE does not send and event log event when trying to delete non-existent id', () => {
			return request(app)
				.delete(`/api/${nodeType}/SomeUniqueAttr/foo-undefined`)
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(() => {
					expect(stubSendEvent).to.have.not.been.called;
				});
		});
	});
});
