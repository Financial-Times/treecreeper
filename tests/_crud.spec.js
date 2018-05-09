const app = require('../server/app.js');
const request = require('supertest');
const {session: db} = require('../server/db-connection');
const assert = require('chai').assert;

describe('crud', () => {
	describe('GET generic', () => {
		let nodes;

		beforeEach(async () => {
			nodes = [{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }];
			for (let node of nodes) {
				const deleteQuery = `MATCH (a:SomeNodeType { SomeUniqueAttr: "${node.SomeUniqueAttr}" }) DELETE a`;
				await db.run(deleteQuery);
			}
			const createQuery = 'CREATE (a:SomeNodeType $node) RETURN a';
			for (let node of nodes) {
				await db.run(createQuery, { node: node });
			}
		});

		afterEach(async () => {
			for (let node of nodes) {
				const deleteQuery = `MATCH (a:SomeNodeType { SomeUniqueAttr: "${node.SomeUniqueAttr}" }) DELETE a`;
				const deleteRshipQuery = 'MATCH ()-[r]->() WHERE type(r)=~"REL.*" DELETE r';
				await db.run(deleteQuery);
				await db.run(deleteRshipQuery);
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
			.expect(404, 'SomeNodeType JonathanTaylorThomas not found', );
		});

		it('GET no api_key returns 400', () => {
			request(app)
			.get('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
			.expect(400);
		});

		it('GET when specified with a relationships param will include related nodes - but none for this node', () => {
			return request(app)
				.get('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/relationships')
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(404, {});
		});

		it('GET when specified with a relationships param will include related nodes - one for this node', async () => {
			const expectedNodes = [{
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
			}]
			const addNodeQuery = `CREATE (t:TestNode {id:'testing'})`;
			const addNodeResult = await db.run(addNodeQuery);
			const addRelQuery = `MERGE (n:SomeNodeType {SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'})-[r:TestRelationship]->(t:TestNode {id:'testing'}) RETURN r`;
			const addRelResult = await db.run(addRelQuery);
			return request(app)
				.get('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/relationships')
				.set('API_KEY', `${process.env.API_KEY}`)
				.expect(200, expectedNodes)
				.then( async (response) => {
					const delRelQuery = `MATCH (t:TestNode {id:'testing'}) DETACH DELETE t`;
					await db.run(delRelQuery)
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
			const deleteRship = 'MATCH ()-[r]->() WHERE type(r)=~"REL.*" DELETE r';
			await db.run(deleteRship);
			const deleteQuery = 'MATCH (a:SomeNodeType) DELETE a';
			await db.run(deleteQuery);
			originalNode = null;
			correctNode = null;
		});

		it('POST inserts the node with correct unique attribute', async () => {
			const expectedNodes = [{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }]
			return request(app)
			.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
			.set('API_KEY', `${process.env.API_KEY}`)
			.send({ node: originalNode })
			.expect(200, correctNode)
			.then( async (response) => {
				return request(app)
					.get('/api/SomeNodeType/')
					.set('API_KEY', `${process.env.API_KEY}`)
					.expect(200, expectedNodes);
			})
		});

		it('POST inserts the node and links it to related node if it exists', async () => {
			const expectedNodes = [
				{ OtherUniqueAttrName: "OtherUniqueAttrValue"},
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
			]
			const relationship = {
				name:'REL',
				from: 'SomeNodeType',
				fromUniqueAttrName: 'SomeUniqueAttr',
				fromUniqueAttrValue: 'SomeUniqueAttrValue',
				toUniqueAttrName: 'OtherUniqueAttrName',
				toUniqueAttrValue: 'OtherUniqueAttrValue',
				to: 'SomeNodeType'
			};

			const createTargetNode = 'CREATE (a:SomeNodeType {OtherUniqueAttrName: "OtherUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode);

			return request(app)
			.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
			.set('API_KEY', `${process.env.API_KEY}`)
			.send({
				node: originalNode,
				relationships: [relationship]
			})
			.expect(200)
			.then( async (response) => {
				const body = response.body;
				console.log('RES HERE', await body);
				assert.equal(body.length, 1);
				assert.equal(body[0].type, relationship.name);
				return request(app)
					.get('/api/SomeNodeType/')
					.set('API_KEY', `${process.env.API_KEY}`)
					.expect(200, expectedNodes);
			});
		});

		it('POST inserts the node and links it to multiple related nodes if they all exist', async () => {
			const expectedNodes = [
				{ OneUniqueAttrName: "OneUniqueAttrValue"},
				{ TwoUniqueAttrName: "TwoUniqueAttrValue"},
				{ ThreeUniqueAttrName: "ThreeUniqueAttrValue"},
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
			]

			const relationships = [
				{
					name:'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OneUniqueAttrName',
					toUniqueAttrValue: 'OneUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name:'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'TwoUniqueAttrName',
					toUniqueAttrValue: 'TwoUniqueAttrValue',
					to: 'SomeNodeType'
				},				{
					name:'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'ThreeUniqueAttrName',
					toUniqueAttrValue: 'ThreeUniqueAttrValue',
					to: 'SomeNodeType'
				},
			];

			const createTargetNode1 = 'CREATE (a:SomeNodeType {OneUniqueAttrName: "OneUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode1);
			const createTargetNode2 = 'CREATE (a:SomeNodeType {TwoUniqueAttrName: "TwoUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode2);
			const createTargetNode3 = 'CREATE (a:SomeNodeType {ThreeUniqueAttrName: "ThreeUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode3);

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: relationships
				})
				.expect(200)
				.then( async (response) => {
					const body = response.body;
					console.log('RES HERE', await body);
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('POST inserts the node and links it to a single multiple-related node if it exists', async () => {
			const expectedNodes = [
				{ OtherUniqueAttrName: "OtherUniqueAttrValue"},
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
			]

			const relationships = [
				{
					name:'REL1',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name:'REL2',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},				{
					name:'REL3',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
			];

			const createTargetNode = 'CREATE (a:SomeNodeType {OtherUniqueAttrName: "OtherUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode);

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: relationships
				})
				.expect(200)
				.then( async (response) => {
					const body = response.body;
					console.log('RES HERE', await body);
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('POST fails if the related node does not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
			]

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: [
						{
							name:'REL',
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
			.then( async (response) => {
				return request(app)
					.get('/api/SomeNodeType/')
					.set('API_KEY', `${process.env.API_KEY}`)
					.expect(200, expectedNodes);
			});
		});

		it('POST fails if multiple related nodes do not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
			]

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: [
						{
							name:'REL',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent1',
							to: 'SomeNodeType'
						},
						{
							name:'REL',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent2',
							to: 'SomeNodeType'
						},
						{
							name:'REL',
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
				.then( async (response) => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('POST fails if single multiple-related node does not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
			]
			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: originalNode,
					relationships: [
						{
							name:'REL1',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent',
							to: 'SomeNodeType'
						},
						{
							name:'REL2',
							from: 'SomeNodeType',
							fromUniqueAttrName: 'SomeUniqueAttr',
							fromUniqueAttrValue: 'SomeUniqueAttrValue',
							toUniqueAttrName: 'id',
							toUniqueAttrValue: 'nonExistent',
							to: 'SomeNodeType'
						},
						{
							name:'REL3',
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
				.then( async (response) => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('POST inserts the node and links it to a related node that does not exist if using upsert', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue'},
			]

			const relationship = {
				name:'REL',
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
			.then( async (response) => {
				const body = response.body;
				console.log('RES HERE', await body);
				assert.equal(body.length, 1);
				assert.equal(body[0].type, relationship.name);
				return request(app)
					.get('/api/SomeNodeType/')
					.set('API_KEY', `${process.env.API_KEY}`)
					.expect(200, expectedNodes);
			});
		});

		it('POST inserts the node and links it to multple related nodes that do not exist if using upsert', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OneUniqueAttrName: 'OneUniqueAttrValue'},
				{ TwoUniqueAttrName: 'TwoUniqueAttrValue'},
				{ ThreeUniqueAttrName: 'ThreeUniqueAttrValue'},
			]

			const relationships = [
				{
					name:'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OneUniqueAttrName',
					toUniqueAttrValue: 'OneUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name:'REL',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'TwoUniqueAttrName',
					toUniqueAttrValue: 'TwoUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name:'REL',
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
				.then( async (response) => {
					const body = response.body;
					console.log('RES HERE', await body);
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('POST inserts the node and links it to a single multiple-related node that does not exist if using upsert', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue'},
			]

			const relationships = [
				{
					name:'REL1',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name:'REL2',
					from: 'SomeNodeType',
					fromUniqueAttrName: 'SomeUniqueAttr',
					fromUniqueAttrValue: 'SomeUniqueAttrValue',
					toUniqueAttrName: 'OtherUniqueAttrName',
					toUniqueAttrValue: 'OtherUniqueAttrValue',
					to: 'SomeNodeType'
				},
				{
					name:'REL3',
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
				.then( async (response) => {
					const body = response.body;
					console.log('RES HERE', await body);
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('POST creating duplicate node returns 400', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
			]

			const duplicateNode = { SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' };
			const createQuery = 'CREATE (a:SomeNodeType $node) RETURN a';
			await db.run(createQuery, { node: duplicateNode });

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.send({ node: originalNode })
				.expect(400)
				.then( async (response) => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		// @@ another test that proves a POST doesnt return 400 if you use upsert since it will be overwritten? @@

		it('POST no api_key returns 400', () => {
			const expectedNodes = [ ]

			return request(app)
				.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.send({ node: originalNode })
				.expect(400)
				.then( async (response) => {
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
			node = {SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'};
			modification = {potato: 'potah-to'};
			modifiedNode = {SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar', potato: 'potah-to'};
			const createQuery = 'CREATE (a:SomeNodeType $node) RETURN a';
			await db.run(createQuery, {node: node});
		});

		afterEach(async () => {
			const deleteRshipQuery = 'MATCH ()-[r]->() WHERE type(r)=~"REL.*" DELETE r';
			const deleteQuery = 'MATCH (a:SomeNodeType) DELETE a';
			await db.run(deleteRshipQuery);
			await db.run(deleteQuery);

			node = null;
			modifiedNode = null;
			modification = null;
		});

		it('PUT modifies an existing node', () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar', potato: 'potah-to' },
			]
			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({node: modification})
				.expect(200, modifiedNode)
				.then( async (response) => {
						return request(app)
							.get('/api/SomeNodeType/')
							.set('API_KEY', `${process.env.API_KEY}`)
							.expect(200, expectedNodes);
				});
		});

		it('PUT returns 200 even if props updated with the same value they had before', () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
			]
			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({node: node})
				.expect(200, node)
				.then( async (response) => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT for a node that doesn\'t exist returns 404', () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
			]

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/NonExistent')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({node: node})
				.expect(404)
				.then( async (response) => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT for a node that doesn\'t exist creates if using upsert', () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
				{ SomeUniqueAttr: 'NonExistent', foo: 'bar'},
			]

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/NonExistent/upsert')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({node: node})
				.expect(200)
				.then( async (response) => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT updates the node if it exists, and links it to a related node if it exists', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue'},
			]

			const relationship = {
				name: 'REL',
				from: 'SomeNodeType',
				fromUniqueAttrName: 'SomeUniqueAttr',
				fromUniqueAttrValue: 'SomeUniqueAttrValue',
				toUniqueAttrName: 'OtherUniqueAttrName',
				toUniqueAttrValue: 'OtherUniqueAttrValue',
				to: 'SomeNodeType'
			};

			const createTargetNode = 'CREATE (a:SomeNodeType {OtherUniqueAttrName: "OtherUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode);

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: [relationship]
				})
				.expect(200)
				.then(async (response) => {
					const body = response.body;
					console.log('RES HERE', await body);
					assert.equal(body.length, 1);
					assert.equal(body[0].type, relationship.name);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT updates the node if it exists, and links it to multiple related nodes if they exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
				{ OneUniqueAttrName: 'OneUniqueAttrValue'},
				{ TwoUniqueAttrName: 'TwoUniqueAttrValue'},
				{ ThreeUniqueAttrName: 'ThreeUniqueAttrValue'},
			]

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

			const createTargetNode1 = 'CREATE (a:SomeNodeType {OneUniqueAttrName: "OneUniqueAttrValue"}) RETURN a';
			const createTargetNode2 = 'CREATE (a:SomeNodeType {TwoUniqueAttrName: "TwoUniqueAttrValue"}) RETURN a';
			const createTargetNode3 = 'CREATE (a:SomeNodeType {ThreeUniqueAttrName: "ThreeUniqueAttrValue"}) RETURN a';
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
				.then(async (response) => {
					const body = response.body;
					console.log('RES HERE', await body);
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT updates the node if it exists, and links it to a single multiple-related node it exists', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue'},
			]

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

			const createTargetNode = 'CREATE (a:SomeNodeType {OtherUniqueAttrName: "OtherUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode);

			return request(app)
				.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({
					node: node,
					relationships: relationships
				})
				.expect(200)
				.then(async (response) => {
					const body = response.body;
					console.log('RES HERE', await body);
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT fails if the related node does not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
			]

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
				.then(async (response) => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT fails if the multiple related nodes do not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
			]

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
				.then(async (response) => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT fails if the single multiple-related node does not exist', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
			]

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
				.then(async (response) => {
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT creates the node if it doesnt exist, and links it to a related node even if it does not exist, with upsert', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue'},
			]

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
				.then(async (response) => {
					const body = response.body;
					console.log('RES HERE', await body);
					assert.equal(body.length, 1);
					assert.equal(body[0].type, relationship.name);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT creates the node if it doesnt exist, and links it to multiple related node even if they do not exist, with upsert', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
				{ OneUniqueAttrName: 'OneUniqueAttrValue'},
				{ TwoUniqueAttrName: 'TwoUniqueAttrValue'},
				{ ThreeUniqueAttrName: 'ThreeUniqueAttrValue'},
			]

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
				.then(async (response) => {
					const body = response.body;
					console.log('RES HERE', await body);
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});

		it('PUT creates the node if it doesnt exist, and links it to a single multiple-related node even it does not exist, with upsert', async () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'},
				{ OtherUniqueAttrName: 'OtherUniqueAttrValue'},
			]

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
				.then(async (response) => {
					const body = response.body;
					console.log('RES HERE', await body);
					assert.equal(body.length, 1);
					return request(app)
						.get('/api/SomeNodeType/')
						.set('API_KEY', `${process.env.API_KEY}`)
						.expect(200, expectedNodes);
				});
		});
	});

	describe('DELETE generic', () => {
		let nodes;

		beforeEach(async () => {
			nodes = [{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }, { SomeUniqueAttr: 'OtherUniqueAttrValue', lorem: 'ipsum' }];
			const createQuery = 'CREATE (a:SomeNodeType $node) RETURN a';
			for (let node of nodes) {
				await db.run(createQuery, { node: node });
			}
		});

		afterEach(async () => {
			for (let node of nodes) {
				const deleteQuery = `MATCH (a:SomeNodeType { SomeUniqueAttr: "${node.SomeUniqueAttr}" }) DELETE a`;
				await db.run(deleteQuery);
			}
			nodes = null;
		});

		it('DELETE with unique attribute deletes the node', () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'OtherUniqueAttrValue', lorem: 'ipsum' }
			];

			return request(app)
			.delete('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
			.set('API_KEY', `${process.env.API_KEY}`)
			.expect(200, 'SomeUniqueAttrValue deleted')
			.then(async (response) => {
				 return request(app)
					.get('/api/SomeNodeType/')
					.set('API_KEY', `${process.env.API_KEY}`)
					.expect(200, expectedNodes);
			});
		});

		it('DELETE returns 404 when trying to delete non-existent id', () => {
			const expectedNodes = [
				{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
				{ SomeUniqueAttr: 'OtherUniqueAttrValue', lorem: 'ipsum' }
			];

			return request(app)
			.delete('/api/SomeNodeType/SomeUniqueAttr/Foo')
			.set('API_KEY', `${process.env.API_KEY}`)
			.expect(404, 'Foo not found. No nodes deleted.')
			.then(async (response) => {
				return request(app)
					.get('/api/SomeNodeType/')
					.set('API_KEY', `${process.env.API_KEY}`)
					.expect(200, expectedNodes);
			});
		});
	});
});
