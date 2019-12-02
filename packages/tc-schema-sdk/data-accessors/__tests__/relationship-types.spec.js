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
									hasMany: true,
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
			type: 'Type2',
			relationship: 'RELATED',
			direction: 'outgoing',
			hasMany: true,
			from: 'Type1',
			to: 'Type2',
		});
		expect(to).toMatchObject({
			type: 'Type1',
			relationship: 'RELATED',
			direction: 'incoming',
			hasMany: true,
			from: 'Type1',
			to: 'Type2',
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
								hasMany: true,
							},
							to: {
								type: 'Type2',
								hasMany: true,
							},
							isMutal: true,
						},
					],
				},
			},
		}).getRelationshipTypes();

		expect(relationshipTypes).toHaveLength(2);

		const [from, to] = relationshipTypes;
		expect(from).toMatchObject({
			type: 'Type2',
			relationship: 'RELATED',
			direction: 'outgoing',
			hasMany: true,
			from: 'Type1',
			to: 'Type2',
		});
		expect(to).toMatchObject({
			type: 'Type1',
			relationship: 'RELATED',
			direction: 'incoming',
			hasMany: true,
			from: 'Type1',
			to: 'Type2',
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
									cypher:
										'MATCH (n1:Type1)-[:RELATED]->(n2:Type2)',
								},
							},
						},
						{
							name: 'Type2',
							properties: {
								relatedFrom: {
									cypher:
										'MATCH (n1:Type1)-[:RELATED]->(n2:Type2)',
								},
							},
						},
					],
				},
			},
		}).getRelationshipTypes({ excludeCypherRelationships: true });

		expect(relationshipTypes).toHaveLength(0);
	});
});
