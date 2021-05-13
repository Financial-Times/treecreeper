const { SDK } = require('../../sdk');

describe('get-relationship-types', () => {
	it('old relationship structure', () => {
		const relationshipTypes = new SDK({
			schemaData: {
				schema: {
					types: [
						{
							name: 'Type1',
							properties: {
								relatedTo: {
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
								relatedFrom: {
									type: 'Type1',
									relationship: 'RELATED',
									direction: 'incoming',
									hasMany: false,
								},
							},
						},
					],
				},
			},
		}).getRelationshipTypes();

		expect(relationshipTypes).toHaveLength(2);

		const [from, to] = relationshipTypes;
		expect(from).toMatchObject({
			relationship: 'RELATED',
			from: {
				type: 'Type1',
				hasMany: false,
			},
			to: { type: 'Type2', hasMany: true },
		});
		expect(to).toMatchObject({
			relationship: 'RELATED',
			from: {
				type: 'Type1',
				hasMany: false,
			},
			to: { type: 'Type2', hasMany: true },
		});
	});

	it('root rich relationship structure', () => {
		const relationshipTypes = new SDK({
			schemaData: {
				schema: {
					types: [
						{
							name: 'Type1',
							properties: {
								relatedTo: {
									type: 'Related',
								},
							},
						},
						{
							name: 'Type2',
							properties: {
								relatedFrom: {
									type: 'Related',
								},
							},
						},
					],
					relationshipTypes: [
						{
							name: 'Related',
							relationship: 'RELATED',
							from: {
								type: 'Type1',
								hasMany: false,
							},
							to: {
								type: 'Type2',
								hasMany: true,
							},
						},
					],
				},
			},
		}).getRelationshipTypes();

		expect(relationshipTypes).toHaveLength(2);

		const [from, to] = relationshipTypes;
		expect(from).toMatchObject({
			relationship: 'RELATED',
			from: {
				type: 'Type1',
				hasMany: false,
			},
			to: { type: 'Type2', hasMany: true },
		});
		expect(to).toMatchObject({
			relationship: 'RELATED',
			from: {
				type: 'Type1',
				hasMany: false,
			},
			to: { type: 'Type2', hasMany: true },
		});
	});

	it('exclude cypher relationship', () => {
		const relationshipTypes = new SDK({
			schemaData: {
				schema: {
					types: [
						{
							name: 'Type1',
							properties: {
								relatedTo: {
									cypher: 'MATCH (n1:Type1)-[:RELATED]->(n2:Type2)',
								},
							},
						},
						{
							name: 'Type2',
							properties: {
								relatedFrom: {
									cypher: 'MATCH (n1:Type1)-[:RELATED]->(n2:Type2)',
								},
							},
						},
					],
				},
			},
		}).getRelationshipTypes();

		expect(relationshipTypes).toHaveLength(0);
	});
});
