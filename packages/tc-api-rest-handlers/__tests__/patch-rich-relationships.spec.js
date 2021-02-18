const { setupMocks, neo4jTest } = require('../../../test-helpers');

const { patchHandler } = require('../patch');

const patch = patchHandler();

describe('rest PATCH rich relationship create', () => {
	const namespace = 'api-rest-handlers-patch-rich-relationships';
	const mainCode = `${namespace}-main`;
	const childCode = `${namespace}-child`;
	const parentCode = `${namespace}-parent`;
	const parentCode2 = `${parentCode}-2`;

	const {
		createNode,
		createNodes,
		stockMetadata,
		getMetaPayload,
		connectNodes,
	} = setupMocks(namespace);

	const getInput = (body, query, metadata = getMetaPayload()) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const basicHandler = (...args) => patchHandler()(getInput(...args));

	const createMainNode = (props = {}) =>
		createNode('MainType', { code: mainCode, ...props });

	describe('Relationship properties', () => {
		const leafCode = `${namespace}-leaf`;

		it("update existing relationship's property", async () => {
			const [main, leaf] = await createNodes(
				['SimpleGraphBranch', mainCode],
				['SimpleGraphLeaf', leafCode],
			);
			await connectNodes(main, 'HAD_LEAF', leaf, {
				stringProperty: 'some string',
			});
			const { body, status } = await patch({
				type: 'SimpleGraphBranch',
				code: mainCode,
				body: {
					fallenLeaves: [
						{ code: leafCode, stringProperty: 'new some string' },
					],
				},
				query: { relationshipAction: 'merge', richRelationships: true },
				metadata: getMetaPayload(),
			});

			expect(status).toBe(200);
			expect(body.fallenLeaves[0]).toMatchObject({
				stringProperty: 'new some string',
			});

			await neo4jTest('SimpleGraphBranch', mainCode)
				.match(stockMetadata.default)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAD_LEAF',
						direction: 'outgoing',
						props: {
							stringProperty: 'new some string',
							...stockMetadata.update,
						},
					},
					{
						type: 'SimpleGraphLeaf',
						props: {
							code: leafCode,
							...stockMetadata.default,
						},
					},
				);
		});

		it('deletes a property as an update', async () => {
			const [main, leaf] = await createNodes(
				['SimpleGraphBranch', mainCode],
				['SimpleGraphLeaf', leafCode],
			);
			await connectNodes(main, 'HAD_LEAF', leaf, {
				stringProperty: 'some string',
			});
			const { body, status } = await patch({
				type: 'SimpleGraphBranch',
				code: mainCode,
				body: {
					fallenLeaves: [{ code: leafCode, stringProperty: null }],
				},
				query: { relationshipAction: 'merge', richRelationships: true },
				metadata: getMetaPayload(),
			});

			expect(status).toBe(200);
			expect(body.fallenLeaves[0]).not.toMatchObject({
				stringProperty: 'some string',
			});
			await neo4jTest('SimpleGraphBranch', mainCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAD_LEAF',
						direction: 'outgoing',
						props: stockMetadata.update,
						notProps: ['stringProperty'],
					},
					{
						type: 'SimpleGraphLeaf',
						props: {
							code: leafCode,
							...stockMetadata.default,
						},
					},
				);
		});

		it('throws 400 if attempting to write relationship property not in schema', async () => {
			const [main, leaf] = await createNodes(
				['SimpleGraphBranch', mainCode],
				['SimpleGraphLeaf', leafCode],
			);
			await connectNodes(main, 'HAD_LEAF', leaf, {
				stringProperty: 'some string',
			});

			await expect(
				patch({
					type: 'SimpleGraphBranch',
					code: mainCode,
					body: {
						fallenLeaves: [
							{ code: leafCode, notInSchema: 'a string' },
						],
					},
					query: {
						relationshipAction: 'merge',
						richRelationships: true,
					},
				}),
			).rejects.httpError({
				status: 400,
				message: 'Invalid property `notInSchema` on type `FallenLeaf`.',
			});
			await neo4jTest('SimpleGraphBranch', mainCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAD_LEAF',
						direction: 'outgoing',
						props: {
							stringProperty: 'some string',
							...stockMetadata.default,
						},
						notProps: ['notInSchema'],
					},
					{
						type: 'SimpleGraphLeaf',
						props: {
							code: leafCode,
							...stockMetadata.default,
						},
					},
				);
		});
	});

	describe('rich relationship information', () => {
		const someString = 'some string';
		const anotherString = 'another string';
		const someBoolean = true;
		const someEnum = 'First';
		const someMultipleChoice = ['First', 'Second'];

		const queries = {
			upsert: true,
			relationshipAction: 'merge',
			richRelationships: true,
		};

		const childRelationshipProps = { code: childCode, someString };
		const childRelationshipTwoProps = {
			code: childCode,
			someString,
			anotherString,
		};
		const parentRelationshipProps = { code: parentCode, someString };
		const parent2RelationshipProps = { code: parentCode2, anotherString };

		it('returns record with rich relationship information if richRelationships query is true', async () => {
			await createMainNode();
			await createNodes(
				['ChildType', childCode],
				['ParentType', parentCode],
			);

			const { body, status } = await basicHandler(
				{ children: childCode, parents: parentCode },
				queries,
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				children: [{ code: childCode, ...stockMetadata.create }],
				parents: [{ code: parentCode, ...stockMetadata.create }],
			});
		});

		it('creates record with relationship which has properties (one child one prop)', async () => {
			await createMainNode();
			await createNodes(['ChildType', childCode]);
			const { status, body } = await basicHandler(
				{ curiousChild: [childRelationshipProps] },
				queries,
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				curiousChild: {
					...childRelationshipProps,
					...stockMetadata.create,
				},
			});

			await neo4jTest('MainType', mainCode)
				.match(stockMetadata.update)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_CURIOUS_CHILD',
						direction: 'outgoing',
						props: { someString, ...stockMetadata.create },
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...stockMetadata.default },
					},
				);
		});

		it('creates record with relationship which has properties (one child two props)', async () => {
			await createMainNode();
			await createNodes(['ChildType', childCode]);
			const { status, body } = await basicHandler(
				{ curiousChild: [childRelationshipTwoProps] },
				queries,
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				curiousChild: {
					...childRelationshipTwoProps,
					...stockMetadata.create,
				},
			});

			await neo4jTest('MainType', mainCode)
				.match(stockMetadata.update)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_CURIOUS_CHILD',
						direction: 'outgoing',
						props: {
							someString,
							anotherString,
							...stockMetadata.create,
						},
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...stockMetadata.default },
					},
				);
		});

		it('creates record with relationship which has properties (two parents)', async () => {
			await createMainNode();
			await createNodes(
				['ParentType', parentCode],
				['ParentType', parentCode2],
			);
			const { status, body } = await basicHandler(
				{
					curiousParent: [
						parentRelationshipProps,
						parent2RelationshipProps,
					],
				},
				queries,
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				curiousParent: [
					{ ...parentRelationshipProps, ...stockMetadata.create },
					{ ...parent2RelationshipProps, ...stockMetadata.create },
				],
			});

			await neo4jTest('MainType', mainCode)
				.match(stockMetadata.update)
				.hasRels(2)
				.hasRel(
					{
						type: 'IS_CURIOUS_PARENT_OF',
						direction: 'incoming',
						props: { someString, ...stockMetadata.create },
					},
					{
						type: 'ParentType',
						props: { code: parentCode, ...stockMetadata.default },
					},
				)
				.hasRel(
					{
						type: 'IS_CURIOUS_PARENT_OF',
						direction: 'incoming',
						props: { anotherString, ...stockMetadata.create },
					},
					{
						type: 'ParentType',
						props: { code: parentCode2, ...stockMetadata.default },
					},
				);
		});

		it('creates record with relationship which has properties (child and parent)', async () => {
			await createMainNode();
			await createNodes(
				['ChildType', childCode],
				['ParentType', parentCode],
			);
			const { status, body } = await basicHandler(
				{
					curiousChild: [childRelationshipProps],
					curiousParent: [parentRelationshipProps],
				},
				queries,
			);

			expect(status).toBe(200);
			// curiousChild's hasMany value is false, curiousParent's hasMany value is true
			// Therefore in body, curiousParent is in an Array and curiousChild is not.
			expect(body).toMatchObject({
				curiousChild: {
					...childRelationshipProps,
					...stockMetadata.create,
				},
				curiousParent: [
					{ ...parentRelationshipProps, ...stockMetadata.create },
				],
			});

			await neo4jTest('MainType', mainCode)
				.match(stockMetadata.update)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_CURIOUS_CHILD',
						direction: 'outgoing',
						props: { someString, ...stockMetadata.create },
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...stockMetadata.default },
					},
				)
				.hasRel(
					{
						type: 'IS_CURIOUS_PARENT_OF',
						direction: 'incoming',
						props: { someString, ...stockMetadata.create },
					},
					{
						type: 'ParentType',
						props: { code: parentCode, ...stockMetadata.default },
					},
				);
		});

		it('creates record with relationships which has a property and also no property', async () => {
			await createMainNode();
			await createNodes(
				['ChildType', childCode],
				['ParentType', parentCode],
			);
			const { status, body } = await basicHandler(
				{
					curiousChild: [childRelationshipProps],
					curiousParent: [parentCode],
				},
				queries,
			);

			expect(status).toBe(200);
			// curiousChild's hasMany value is false, curiousParent's hasMany value is true
			// Therefore in body, curiousParent is in an Array and curiousChild is not.
			expect(body).toMatchObject({
				curiousChild: {
					...childRelationshipProps,
					...stockMetadata.create,
				},
				curiousParent: [{ code: parentCode, ...stockMetadata.create }],
			});

			await neo4jTest('MainType', mainCode)
				.match(stockMetadata.update)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_CURIOUS_CHILD',
						direction: 'outgoing',
						props: { someString, ...stockMetadata.create },
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...stockMetadata.default },
					},
				)
				.hasRel(
					{
						type: 'IS_CURIOUS_PARENT_OF',
						direction: 'incoming',
						props: { ...stockMetadata.create },
					},
					{
						type: 'ParentType',
						props: { code: parentCode, ...stockMetadata.default },
					},
				);
		});

		it('creates record with relationships which have same properties with different values (two parents)', async () => {
			const parentOneRelationshipProps = {
				code: parentCode,
				someString: 'parent one some string',
				anotherString: 'Parent one another string',
			};
			const parentTwoRelationshipProps = {
				code: parentCode2,
				someString,
				anotherString,
			};
			await createMainNode();
			await createNodes(
				['ParentType', parentCode],
				['ParentType', parentCode2],
			);

			const { status, body } = await basicHandler(
				{
					curiousParent: [
						parentOneRelationshipProps,
						parentTwoRelationshipProps,
					],
				},
				queries,
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				curiousParent: [
					{ ...parentOneRelationshipProps, ...stockMetadata.create },
					{ ...parentTwoRelationshipProps, ...stockMetadata.create },
				],
			});

			await neo4jTest('MainType', mainCode)
				.match(stockMetadata.update)
				.hasRels(2)
				.hasRel(
					{
						type: 'IS_CURIOUS_PARENT_OF',
						direction: 'incoming',
						props: {
							someString: parentOneRelationshipProps.someString,
							anotherString:
								parentOneRelationshipProps.anotherString,
							...stockMetadata.create,
						},
					},
					{
						type: 'ParentType',
						props: { code: parentCode, ...stockMetadata.default },
					},
				)
				.hasRel(
					{
						type: 'IS_CURIOUS_PARENT_OF',
						direction: 'incoming',
						props: {
							someString,
							anotherString,
							...stockMetadata.create,
						},
					},
					{
						type: 'ParentType',
						props: { code: parentCode2, ...stockMetadata.default },
					},
				);
		});

		it('creates record with relationships which have same properties with different values (child and parent)', async () => {
			const parentRelProps = {
				code: parentCode,
				someString: 'parent some string',
				anotherString: 'Parent another string',
			};
			const childRelProps = {
				code: childCode,
				someString,
				anotherString,
				someMultipleChoice,
				someEnum,
				someBoolean,
			};

			await createMainNode();
			await createNodes(
				['ChildType', childCode],
				['ParentType', parentCode],
			);
			const { status, body } = await basicHandler(
				{
					curiousChild: [childRelProps],
					curiousParent: [parentRelProps],
				},
				queries,
			);

			expect(status).toBe(200);
			// curiousChild's hasMany value is false, curiousParent's hasMany value is true
			// Therefore in body, curiousParent is in an Array and curiousChild is not.
			expect(body).toMatchObject({
				curiousChild: { ...childRelProps, ...stockMetadata.create },
				curiousParent: [{ ...parentRelProps, ...stockMetadata.create }],
			});

			await neo4jTest('MainType', mainCode)
				.match(stockMetadata.update)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_CURIOUS_CHILD',
						direction: 'outgoing',
						props: {
							someString,
							anotherString,
							someMultipleChoice,
							someEnum,
							someBoolean,
							...stockMetadata.create,
						},
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...stockMetadata.default },
					},
				)
				.hasRel(
					{
						type: 'IS_CURIOUS_PARENT_OF',
						direction: 'incoming',
						props: {
							someString: parentRelProps.someString,
							anotherString: parentRelProps.anotherString,
							...stockMetadata.create,
						},
					},
					{
						type: 'ParentType',
						props: { code: parentCode, ...stockMetadata.default },
					},
				);
		});

		it('creates record with relationship which has a multiple choice property', async () => {
			await createMainNode();
			await createNodes(['ChildType', childCode]);
			const { status, body } = await basicHandler(
				{
					curiousChild: { code: childCode, someMultipleChoice },
				},
				queries,
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				curiousChild: {
					code: childCode,
					someMultipleChoice,
					...stockMetadata.create,
				},
			});

			await neo4jTest('MainType', mainCode)
				.match(stockMetadata.update)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_CURIOUS_CHILD',
						direction: 'outgoing',
						props: {
							someMultipleChoice,
							...stockMetadata.create,
						},
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...stockMetadata.default },
					},
				);
		});

		it('creates record with relationship which has an enum property', async () => {
			await createMainNode();
			await createNodes(['ChildType', childCode]);
			const { status, body } = await basicHandler(
				{
					curiousChild: { code: childCode, someEnum },
				},
				queries,
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				curiousChild: {
					code: childCode,
					someEnum,
					...stockMetadata.create,
				},
			});

			await neo4jTest('MainType', mainCode)
				.match(stockMetadata.update)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_CURIOUS_CHILD',
						direction: 'outgoing',
						props: {
							someEnum,
							...stockMetadata.create,
						},
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...stockMetadata.default },
					},
				);
		});

		it('creates record with relationship which has a boolean property', async () => {
			await createMainNode();
			await createNodes(['ChildType', childCode]);
			const { status, body } = await basicHandler(
				{
					curiousChild: { code: childCode, someBoolean },
				},
				queries,
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				curiousChild: {
					code: childCode,
					someBoolean,
					...stockMetadata.create,
				},
			});

			await neo4jTest('MainType', mainCode)
				.match(stockMetadata.update)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_CURIOUS_CHILD',
						direction: 'outgoing',
						props: {
							someBoolean,
							...stockMetadata.create,
						},
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...stockMetadata.default },
					},
				);
		});

		it('errors if relationship property does not exist in schema', async () => {
			await createMainNode();
			await createNodes(['ChildType', childCode]);
			await expect(
				basicHandler(
					{
						curiousChild: [
							{ code: childCode, notInSchema: 'a string' },
						],
					},
					queries,
				),
			).rejects.httpError({
				status: 400,
				message:
					'Invalid property `notInSchema` on type `CuriousChild`.',
			});

			await neo4jTest('MainType', mainCode)
				.match(stockMetadata.default)
				.noRels();
		});

		it('create node related to nodes with strange codes', async () => {
			const oddCode = `${namespace}:thing/odd`;
			await createMainNode();
			const { status, body } = await basicHandler(
				{
					oddThings: { code: oddCode, oddString: 'blah' },
				},
				queries,
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				oddThings: [
					{
						code: oddCode,
						oddString: 'blah',
					},
				],
			});

			await neo4jTest('MainType', mainCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_ODD_CODED_THING',
						direction: 'outgoing',
						props: { oddString: 'blah', ...stockMetadata.create },
					},
					{
						type: 'OddCodeType',
						props: {
							code: oddCode,
							...stockMetadata.create,
						},
					},
				);
		});
	});
});
