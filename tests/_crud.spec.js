const app = require('../server/app.js');
const request = require('supertest');
const db = require('../server/db-connection');
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
				const deleteRshipQuery = 'MATCH ()-[r:REL]->() DELETE r';
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
			expectedNodes = [{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' }]
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
            expectedNodes = [
            	{ SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar' },
                { OtherUniqueAttrName: "OtherUniqueAttrValue"}
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
                },            	{
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
                });
        });

		it('POST fails if the related node does not exist', async () => {
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

        it('POST fails if multiple related nodes do not exist', async () => {
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
                .expect(400);
        });

		it('POST inserts the node and links it to a related node that does not exist if using upsert', async () => {
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
			});
		});

        it('POST inserts the node and links it to multple related nodes that do not exist if using upsert', async () => {
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
                });
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

		// @@ another test that proves a POST doesnt return 400 if you use upsert since it will be overwritten? @@

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
            node = {SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar'};
            modification = {potato: 'potah-to'};
            modifiedNode = {SomeUniqueAttr: 'SomeUniqueAttrValue', foo: 'bar', potato: 'potah-to'};
            const createQuery = 'CREATE (a:SomeNodeType $node) RETURN a';
            await db.run(createQuery, {node: node});
        });

        afterEach(async () => {
            const deleteRshipQuery = 'MATCH ()-[r:REL]->() DELETE r';
            const deleteQuery = 'MATCH (a:SomeNodeType) DELETE a';
            await db.run(deleteRshipQuery);
            await db.run(deleteQuery);

            node = null;
            modifiedNode = null;
            modification = null;
        });

        it('PUT modifies an existing node', () => {
            return request(app)
                .put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
                .set('API_KEY', `${process.env.API_KEY}`)
                .send({node: modification})
                .expect(200, modifiedNode);
        });

        it('PUT returns 200 even if props updated with the same value they had before', () => {
            return request(app)
                .put('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
                .set('API_KEY', `${process.env.API_KEY}`)
                .send({node: node})
                .expect(200, node);
        });

        it('PUT for a node that doesn\'t exist returns 404', () => {
            return request(app)
                .put('/api/SomeNodeType/SomeUniqueAttr/NonExistent')
                .set('API_KEY', `${process.env.API_KEY}`)
                .send({node: node})
                .expect(404);
        });

        it('PUT for a node that doesn\'t exist creates if using upsert', () => {
            return request(app)
                .put('/api/SomeNodeType/SomeUniqueAttr/NonExistent/upsert')
                .set('API_KEY', `${process.env.API_KEY}`)
                .send({node: node})
                .expect(200);
        });

        it('PUT updates the node if it exists, and links it to a related node if it exists', async () => {

            const relationship = {
                name: 'REL',
                from: 'SomeNodeType',
                fromUniqueAttrName: 'SomeUniqueAttr',
                fromUniqueAttrValue: 'SomeUniqueAttrValue',
                toUniqueAttrName: 'OtherUniqueAttrName',
                toUniqueAttrValue: 'OtherUniqueAttrValue',
                to: 'SomeNodeType'
            };

            const createSourceNode = 'CREATE (a:SomeNodeType {SomeUniqueAttr: "SomeUniqueAttrValue"}) RETURN a';
            const createTargetNode = 'CREATE (a:SomeNodeType {OtherUniqueAttrName: "OtherUniqueAttrValue"}) RETURN a';
            await db.run(createSourceNode);
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
                });
        });

        it('PUT updates the node if it exists, and links it to multiple related nodes if they exist', async () => {

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

            const createSourceNode = 'CREATE (a:SomeNodeType {SomeUniqueAttr: "SomeUniqueAttrValue"}) RETURN a';
            const createTargetNode1 = 'CREATE (a:SomeNodeType {OneUniqueAttrName: "OneUniqueAttrValue"}) RETURN a';
            const createTargetNode2 = 'CREATE (a:SomeNodeType {TwoUniqueAttrName: "TwoUniqueAttrValue"}) RETURN a';
            const createTargetNode3 = 'CREATE (a:SomeNodeType {ThreeUniqueAttrName: "ThreeUniqueAttrValue"}) RETURN a';
            await db.run(createSourceNode);
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
                });
        });

        it('POST fails if the related node does not exist', async () => {
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
                .expect(400);
        });

        it('POST fails if the muktiple related nodes do not exist', async () => {
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
                .expect(400);
        });

        it('PUT creates the node if it doesnt exist, and links it to a related node even if it does not exist, with upsert', async () => {

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
                });
        });

        it('PUT creates the node if it doesnt exist, and links it to multiple related node even if they do not exist, with upsert', async () => {

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
