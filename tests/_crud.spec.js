const app = require('../server/app.js');
const request = require('supertest');
const db = require('../server/db-connection');

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
			.expect(404, 'SomeNodeType JonathanTaylorThomas not found', );
		});

		it('GET no api_key returns 400', () => {
			request(app)
			.get('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
			.expect(400);
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

			const deleteRship = 'MATCH ()-[r:REL]->() DELETE r';
			await db.run(deleteRship);
			const deleteQuery = 'MATCH (a:SomeNodeType) DELETE a';
			await db.run(deleteQuery);
			originalNode = null;
			correctNode = null;
		});

		it('POST inserts the node with correct unique attribute', async () => {
			return request(app)
			.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
			.set('API_KEY', `${process.env.API_KEY}`)
			.send({ node: originalNode })
			.expect(200, correctNode);
		});

		it('POST inserts the node and links it to related nodes if they exist', async () => {

			const createTargetNode = 'CREATE (a:SomeNodeType {OtherUniqueAttrName: "OtherUniqueAttrValue"}) RETURN a';
			await db.run(createTargetNode);

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
						toUniqueAttrName: 'OtherUniqueAttrName',
						toUniqueAttrValue: 'OtherUniqueAttrValue',
						to: 'SomeNodeType'
					}
				]
			})
			.expect(200, correctNode);
		});

		it('POST fails if related nodes don\'t exist', async () => {
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
			.expect(400);
		});

		it('POST inserts the node and links it to related nodes that don\'t exist if using upsert', async () => {
			return request(app)
			.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue/upsert')
			.set('API_KEY', `${process.env.API_KEY}`)
			.send({
				node: originalNode,
				relationships: [
					{
						name:'REL',
						from: 'SomeNodeType',
						fromUniqueAttrName: 'SomeUniqueAttr',
						fromUniqueAttrValue: 'SomeUniqueAttrValue',
						toUniqueAttrName: 'OtherUniqueAttrName',
						toUniqueAttrValue: 'OtherUniqueAttrValue',
						to: 'SomeNodeType'
					}
				]
			})
			.expect(200, correctNode);
		});

		it('POST creating duplicate node returns 400', async () => {
			const duplicateNode = { SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' };
			const createQuery = 'CREATE (a:SomeNodeType $node) RETURN a';
			await db.run(createQuery, { node: duplicateNode });

			return request(app)
			.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
			.send({ node: originalNode })
			.expect(400);
		});

		it('POST no api_key returns 400', () => {
			return request(app)
			.post('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
			.send({ node: originalNode })
			.expect(400);
		});
	});

	describe('PUT generic', () => {
		let node;
		let modifiedNode;
		let modification;

		beforeEach(async () => {
			node = { SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' };
			modification = { potato: 'potah-to' };
			modifiedNode = { SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar', potato: 'potah-to' };
			const createQuery = 'CREATE (a:SomeNodeType $node) RETURN a';
			await db.run(createQuery, { node: node });
		});

		afterEach(async () => {
			const deleteQuery = `MATCH (a:SomeNodeType { SomeUniqueAttr: "${node.SomeUniqueAttr}" }) DELETE a`;
			await db.run(deleteQuery);
			node = null;
			modifiedNode = null;
			modification = null;
		});

		it('PUT modifies an existing node', () => {
			return request(app)
			.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
			.set('API_KEY', `${process.env.API_KEY}`)
			.send({ node: modification })
			.expect(200, modifiedNode);
		});

		it('PUT returns 200 even if props updated with the same value they had before', () => {
			return request(app)
			.put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
			.set('API_KEY', `${process.env.API_KEY}`)
			.send({ node: node })
			.expect(200, node);
		});

		it('PUT for a node that doesn\'t exist returns 404', () => {
			return request(app)
			.put('/api/SomeNodeType/SomeUniqueAttr/NonExistent')
			.set('API_KEY', `${process.env.API_KEY}`)
			.send({ node: node })
			.expect(404);
		});

		it('PUT for a node that doesn\'t exist creates if using upsert', () => {
			return request(app)
			.put('/api/SomeNodeType/SomeUniqueAttr/NonExistent/upsert')
			.set('API_KEY', `${process.env.API_KEY}`)
			.send({ node: node })
			.expect(200);
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
			return request(app)
			.delete('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
			.set('API_KEY', `${process.env.API_KEY}`)
			.expect(200, 'SomeUniqueAttrValue deleted');
		});

		it('DELETE returns 404 when trying to delete non-existent id', () => {
			return request(app)
			.delete('/api/SomeNodeType/SomeUniqueAttr/Foo')
			.set('API_KEY', `${process.env.API_KEY}`)
			.expect(404, 'Foo not found. No nodes deleted.');
		});


	});
});
