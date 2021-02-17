const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { postHandler: postHandlerFactory } = require('../post');

const postHandler = postHandlerFactory();

describe('rest POST', () => {
	const namespace = 'api-rest-handlers-post';
	const mainCode = `${namespace}-main`;

	const { meta, getMetaPayload } = setupMocks(namespace);

	describe('creating relationships', () => {
		const leafCode = `${namespace}-leaf`;
		const parentCode = `${namespace}-parent`;
		const parentCode2 = `${parentCode}-2`;

		const postSimpleGraphBranch = (body, query) =>
			postHandler({
				type: 'SimpleGraphBranch',
				code: mainCode,
				body,
				query,
				metadata: getMetaPayload(),
			});

		describe('rich relationship information', () => {
			const firstStringProperty = 'some string';
			const secondStringProperty = 'another string';
			const booleanProperty = true;
			const enumProperty = 'First';
			const multipleChoiceEnumProperty = ['First', 'Second'];
			const leafRelationshipProps = {
				code: leafCode,
				firstStringProperty,
			};
			const leafRelationshipTwoProps = {
				code: leafCode,
				firstStringProperty,
				secondStringProperty,
			};
			const parentRelationshipProps = {
				code: parentCode,
				firstStringProperty,
			};
			const parent2RelationshipProps = {
				code: parentCode2,
				secondStringProperty,
			};

			it('returns record with rich relationship information if richRelationships query is true', async () => {
				const { status, body } = await postSimpleGraphBranch(
					{ leaves: [leafCode], parent: [parentCode] },
					{ upsert: true, richRelationships: true },
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					leaves: [{ code: leafCode, ...meta.create }],
					parent: [{ code: parentCode, ...meta.create }],
				});
			});

			it('creates record with relationship which has properties (one leaf one prop)', async () => {
				const { status, body } = await postSimpleGraphBranch(
					{ curiousChild: [leafRelationshipProps] },
					{ upsert: true, richRelationships: true },
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: { ...leafRelationshipProps, ...meta.create },
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: { firstStringProperty, ...meta.create },
						},
						{
							type: 'SimpleGraphLeaf',
							props: { code: leafCode, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has properties (one leaf two props)', async () => {
				const { status, body } = await postSimpleGraphBranch(
					{ curiousChild: [leafRelationshipTwoProps] },
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: {
						...leafRelationshipTwoProps,
						...meta.create,
					},
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: {
								firstStringProperty,
								secondStringProperty,
								...meta.create,
							},
						},
						{
							type: 'SimpleGraphLeaf',
							props: { code: leafCode, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has properties (two parent)', async () => {
				const { status, body } = await postSimpleGraphBranch(
					{
						curiousParent: [
							parentRelationshipProps,
							parent2RelationshipProps,
						],
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousParent: [
						{ ...parentRelationshipProps, ...meta.create },
						{ ...parent2RelationshipProps, ...meta.create },
					],
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.match(meta.create)
					.hasRels(2)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: { firstStringProperty, ...meta.create },
						},
						{
							type: 'SimpleGraphBranch',
							props: { code: parentCode, ...meta.create },
						},
					)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: { secondStringProperty, ...meta.create },
						},
						{
							type: 'SimpleGraphBranch',
							props: { code: parentCode2, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has properties (leaf and parent)', async () => {
				const { status, body } = await postSimpleGraphBranch(
					{
						curiousChild: [leafRelationshipProps],
						curiousParent: [parentRelationshipProps],
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				// curiousChild's hasMany value is false, curiousParent's hasMany value is true
				// Therefore in body, curiousParent is in an Array and curiousChild is not.
				expect(body).toMatchObject({
					curiousChild: { ...leafRelationshipProps, ...meta.create },
					curiousParent: [
						{
							...parentRelationshipProps,
							...meta.create,
						},
					],
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.match(meta.create)
					.hasRels(2)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: { firstStringProperty, ...meta.create },
						},
						{
							type: 'SimpleGraphLeaf',
							props: { code: leafCode, ...meta.create },
						},
					)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: { firstStringProperty, ...meta.create },
						},
						{
							type: 'SimpleGraphBranch',
							props: { code: parentCode, ...meta.create },
						},
					);
			});

			it('creates record with relationships which has a property and also no property', async () => {
				const { status, body } = await postSimpleGraphBranch(
					{
						curiousChild: [leafRelationshipProps],
						curiousParent: [parentCode],
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				// curiousChild's hasMany value is false, curiousParent's hasMany value is true
				// Therefore in body, curiousParent is in an Array and curiousChild is not.
				expect(body).toMatchObject({
					curiousChild: { ...leafRelationshipProps, ...meta.create },
					curiousParent: [{ code: parentCode, ...meta.create }],
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.match(meta.create)
					.hasRels(2)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: { firstStringProperty, ...meta.create },
						},
						{
							type: 'SimpleGraphLeaf',
							props: { code: leafCode, ...meta.create },
						},
					)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: { ...meta.create },
						},
						{
							type: 'SimpleGraphBranch',
							props: { code: parentCode, ...meta.create },
						},
					);
			});

			it('creates record with relationships which have same properties with different values (two parent)', async () => {
				const parentOneRelationshipProps = {
					code: parentCode,
					firstStringProperty: 'parent one some string',
					secondStringProperty: 'Parent one another string',
				};
				const parentTwoRelationshipProps = {
					code: parentCode2,
					firstStringProperty,
					secondStringProperty,
				};

				const { status, body } = await postSimpleGraphBranch(
					{
						curiousParent: [
							parentOneRelationshipProps,
							parentTwoRelationshipProps,
						],
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousParent: [
						{ ...parentOneRelationshipProps, ...meta.create },
						{ ...parentTwoRelationshipProps, ...meta.create },
					],
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.match(meta.create)
					.hasRels(2)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: {
								firstStringProperty:
									parentOneRelationshipProps.firstStringProperty,
								secondStringProperty:
									parentOneRelationshipProps.secondStringProperty,
								...meta.create,
							},
						},
						{
							type: 'SimpleGraphBranch',
							props: { code: parentCode, ...meta.create },
						},
					)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: {
								firstStringProperty,
								secondStringProperty,
								...meta.create,
							},
						},
						{
							type: 'SimpleGraphBranch',
							props: { code: parentCode2, ...meta.create },
						},
					);
			});

			it('creates record with relationships which have same properties with different values (leaf and parent)', async () => {
				const parentRelProps = {
					code: parentCode,
					firstStringProperty: 'Parent some string',
					secondStringProperty: 'Parent another string',
				};
				const leafRelProps = {
					code: leafCode,
					firstStringProperty,
					secondStringProperty,
					multipleChoiceEnumProperty,
					enumProperty,
					booleanProperty,
				};

				const { status, body } = await postSimpleGraphBranch(
					{
						curiousChild: [leafRelProps],
						curiousParent: [parentRelProps],
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				// curiousChild's hasMany value is false, curiousParent's hasMany value is true
				// Therefore in body, curiousParent is in an Array and curiousChild is not.
				expect(body).toMatchObject({
					curiousChild: { ...leafRelProps, ...meta.create },
					curiousParent: [{ ...parentRelProps, ...meta.create }],
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.match(meta.create)
					.hasRels(2)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: {
								firstStringProperty:
									leafRelProps.firstStringProperty,
								secondStringProperty:
									leafRelProps.secondStringProperty,
								multipleChoiceEnumProperty,
								enumProperty,
								booleanProperty,
								...meta.create,
							},
						},
						{
							type: 'SimpleGraphLeaf',
							props: { code: leafCode, ...meta.create },
						},
					)
					.hasRel(
						{
							type: 'IS_CURIOUS_PARENT_OF',
							direction: 'incoming',
							props: {
								firstStringProperty:
									parentRelProps.firstStringProperty,
								secondStringProperty:
									parentRelProps.secondStringProperty,
								...meta.create,
							},
						},
						{
							type: 'SimpleGraphBranch',
							props: { code: parentCode, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has a multiple choice property', async () => {
				const { status, body } = await postSimpleGraphBranch(
					{
						curiousChild: {
							code: leafCode,
							multipleChoiceEnumProperty,
						},
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: {
						code: leafCode,
						multipleChoiceEnumProperty,
						...meta.create,
					},
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: {
								multipleChoiceEnumProperty,
								...meta.create,
							},
						},
						{
							type: 'SimpleGraphLeaf',
							props: { code: leafCode, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has an enum property', async () => {
				const { status, body } = await postSimpleGraphBranch(
					{
						curiousChild: { code: leafCode, enumProperty },
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);

				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: {
						code: leafCode,
						enumProperty,
						...meta.create,
					},
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: {
								enumProperty,
								...meta.create,
							},
						},
						{
							type: 'SimpleGraphLeaf',
							props: { code: leafCode, ...meta.create },
						},
					);
			});

			it('creates record with relationship which has a boolean property', async () => {
				const { status, body } = await postSimpleGraphBranch(
					{
						curiousChild: { code: leafCode, booleanProperty },
					},
					{ upsert: true, richRelationships: true },
					getMetaPayload(),
				);
				expect(status).toBe(200);
				expect(body).toMatchObject({
					curiousChild: {
						code: leafCode,
						booleanProperty,
						...meta.create,
					},
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.match(meta.create)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CURIOUS_CHILD',
							direction: 'outgoing',
							props: {
								booleanProperty,
								...meta.create,
							},
						},
						{
							type: 'SimpleGraphLeaf',
							props: { code: leafCode, ...meta.create },
						},
					);
			});

			it('throws 400 if attempting to write relationship property not in schema', async () => {
				await expect(
					postSimpleGraphBranch(
						{
							curiousChild: [
								{
									code: leafCode,
									notInSchema: 'a string',
								},
							],
						},
						{ upsert: true, richRelationships: true },
						getMetaPayload(),
					),
				).rejects.httpError({
					status: 400,
					message:
						'Invalid property `notInSchema` on type `CuriousChild`.',
				});

				await neo4jTest('SimpleGraphBranch', mainCode).notExists();
			});
		});
	});
});
