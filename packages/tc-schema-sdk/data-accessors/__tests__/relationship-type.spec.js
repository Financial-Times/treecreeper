const TreecreeperUserError = require('../../lib/biz-ops-error');

const { SDK } = require('../../sdk');

describe('get-relationship-type', () => {
	describe('finding property', () => {
		const schema = new SDK({
			schemaData: {
				schema: {
					types: [
						{
							name: 'Type1',
							properties: {
								someString: {
									type: 'Word',
								},
								someRelationshipTo: {
									type: 'Type2',
									relationship: 'RELATED',
									direction: 'outgoing',
									hasMany: true,
								},
							},
						},
						{
							name: 'Type2',
							properties: {
								someRelationshipFrom: {
									type: 'Type1',
									otherNodeName: 'otherType1',
									relationship: 'RELATED',
									direction: 'incoming',
									hasMany: false,
								},
							},
						},
					],
					primitiveTypes: {
						Word: {
							graphql: 'String',
							component: 'Text',
						},
					},
				},
			},
		});

		it('can retrieve relationship type and otherNodeName', () => {
			const rel = schema.getRelationshipType(
				'Type1',
				'someRelationshipTo',
			);
			expect(rel).toEqual(
				expect.objectContaining({
					from: {
						type: 'Type1',
						otherNodeName: 'otherType1',
						hasMany: false,
					},
					to: {
						type: 'Type2',
						otherNodeName: 'Type2',
						hasMany: true,
					},
					relationship: 'RELATED',
					properties: {},
				}),
			);
		});


		it('throws TreecreeperUserError if root type not exists', () => {
			expect(() =>
				schema.getRelationshipType('OtherType1', 'someString'),
			).toThrow(TreecreeperUserError);
		});

		it('throws TreecreeperUserError if property not found', () => {
			expect(() =>
				schema.getRelationshipType('Type1', 'otherDocument'),
			).toThrow(TreecreeperUserError);
		});

		it('throws TreecreeperUserError if property is not relationship', () => {
			expect(() =>
				schema.getRelationshipType('Type1', 'someString'),
			).toThrow(TreecreeperUserError);
		});
	});

	describe('retrieve with rich realtionship properties', () => {
		const schema = new SDK({
			schemaData: {
				schema: {
					types: [
						{
							name: 'Type1',
							properties: {
								relationshipTo: {
									type: 'Related',
								},
							},
						},
						{
							name: 'Type2',
							properties: {
								relationshipFrom: {
									type: 'Related',
								},
							},
						},
					],
					relationshipTypes: [
						{
							name: 'Related',
							relationship: 'RELATED',
							properties: {
								someString: {
									type: 'Word',
								},
							},
							from: {
								type: 'Type1',
								otherNodeName: 'otherType1',
								hasMany: false,
							},
							to: {
								type: 'Type2',
								hasMany: true,
							},
						},
					],
					primitiveTypes: {
						Word: {
							graphql: 'String',
							component: 'Text',
						},
					},
				},
			},
		});

		it('can retrieve relationship type with expected properties including otherNodeName', () => {
			const from = schema.getRelationshipType('Type1', 'relationshipTo', {
				includeMetaFields: true,
			});
			const to = schema.getRelationshipType('Type2', 'relationshipFrom', {
				includeMetaFields: true,
			});
			expect(from).toEqual(
				expect.objectContaining({
					from: {
						type: 'Type1',
						otherNodeName: 'otherType1',
						hasMany: false,
					},
					to: {
						type: 'Type2',
						otherNodeName: 'Type2',
						hasMany: true,
					},
					relationship: 'RELATED',
					properties: expect.any(Object),
				}),
			);
			expect(from.properties.someString).toMatchObject({
				type: 'Word',
			});
			expect(from.properties).toEqual(
				expect.not.objectContaining({
					_lockedFields: expect.any(String),
				}),
			);

			expect(to).toEqual(
				expect.objectContaining({
					from: {
						type: 'Type1',
						otherNodeName: 'otherType1',
						hasMany: false,
					},
					to: {
						type: 'Type2',
						otherNodeName: 'Type2',
						hasMany: true,
					},
					relationship: 'RELATED',
					properties: expect.any(Object),
				}),
			);
			expect(to.properties.someString).toMatchObject({
				type: 'Word',
			});
			expect(to.properties).toEqual(
				expect.not.objectContaining({
					_lockedFields: expect.any(String),
				}),
			);
		});
	});
});
