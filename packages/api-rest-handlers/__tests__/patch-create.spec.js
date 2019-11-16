const { patchHandler } = require('../patch');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');

describe('rest PATCH create', () => {
	const namespace = 'api-rest-handlers-patch-create';
	const mainCode = `${namespace}-main`;
	const childCode = `${namespace}-child`;
	const childCode2 = `${childCode}-2`;
	const parentCode = `${namespace}-parent`;

	const { meta, getMetaPayload, createNodes } = setupMocks(namespace);

	const getInput = (body, query, metadata = getMetaPayload()) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const basicHandler = (...args) => patchHandler()(getInput(...args));

	describe('writing disconnected records', () => {
		it('creates record with no body', async () => {
			const { status, body } = await basicHandler();

			expect(status).toBe(201);
			expect(body).toMatchObject({
				code: mainCode,
			});
			await neo4jTest('MainType', mainCode).exists();
		});

		it('creates record with properties', async () => {
			const { status, body } = await basicHandler({
				someString: 'some string',
			});

			expect(status).toBe(201);
			expect(body).toMatchObject({
				code: mainCode,
				someString: 'some string',
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someString: 'some string',
				})
				.noRels();
		});

		it('sets metadata', async () => {
			const { status, body } = await basicHandler(
				undefined,
				undefined,
				getMetaPayload(),
			);

			expect(status).toBe(201);
			expect(body).toMatchObject(meta.create);
			await neo4jTest('MainType', mainCode)
				.exists()
				.match(meta.create);
		});
		it('sets array data', async () => {
			const { body, status } = await basicHandler({
				someStringList: ['one', 'two'],
				someMultipleChoice: ['First', 'Second'],
			});

			expect(status).toBe(201);
			expect(body).toMatchObject({
				someStringList: ['one', 'two'],
				someMultipleChoice: ['First', 'Second'],
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					someStringList: ['one', 'two'],
					someMultipleChoice: ['First', 'Second'],
				});
		});
		it("doesn't set a property when empty string provided", async () => {
			const { status, body } = await basicHandler({ someString: '' });

			expect(status).toBe(201);
			expect(body).toMatchObject({
				code: mainCode,
			});

			await neo4jTest('MainType', mainCode)
				.exists()
				.notMatch({
					someString: expect.any(String),
				});
		});

		it('sets Date property', async () => {
			const date = '2019-01-09';
			const { status, body } = await basicHandler({
				someDate: new Date(date).toISOString(),
			});

			expect(status).toBe(201);
			expect(body).toMatchObject({
				code: mainCode,
				someDate: date,
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someDate: date,
				});
		});

		const neo4jTimePrecision = timestamp =>
			timestamp.replace('Z', '000000Z');

		it('sets Datetime property', async () => {
			const datetime = '2019-01-09T00:00:00.001Z';

			const { status, body } = await basicHandler({
				someDatetime: datetime,
			});

			expect(status).toBe(201);
			expect(body).toMatchObject({
				someDatetime: neo4jTimePrecision(datetime),
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someDatetime: neo4jTimePrecision(datetime),
				});
		});

		it('sets Time property', async () => {
			const time = '12:34:56.789Z';

			const { status, body } = await basicHandler({ someTime: time });

			expect(status).toBe(201);
			expect(body).toMatchObject({
				someTime: neo4jTimePrecision(time),
			});
			await neo4jTest('MainType', mainCode)
				.exists()
				.match({
					code: mainCode,
					someTime: neo4jTimePrecision(time),
				})
				.noRels();
		});

		it('throws 400 if code in body conflicts with code in url', async () => {
			await expect(
				basicHandler({ code: 'wrong-code' }),
			).rejects.httpError({
				status: 400,
				message: `Conflicting code property \`wrong-code\` in payload for MainType ${mainCode}`,
			});
			await neo4jTest('MainType', mainCode).notExists();
		});

		it('throws 400 if attempting to write property not in schema', async () => {
			await expect(
				basicHandler({ notInSchema: 'a string' }),
			).rejects.httpError({
				status: 400,
				message: 'Invalid property `notInSchema` on type `MainType`.',
			});
			await neo4jTest('MainType', mainCode).notExists();
		});
	});

	describe('generic error states', () => {
		it('throws if neo4j query fails', async () => {
			dbUnavailable();
			await expect(basicHandler()).rejects.toThrow('oh no');
		});
	});

	describe('restricted types', () => {
		const restrictedCode = `${namespace}-restricted`;

		it('throws 400 when creating restricted record', async () => {
			await expect(
				patchHandler()({
					type: 'RestrictedType',
					code: restrictedCode,
				}),
			).rejects.httpError({
				status: 400,
				message: `RestrictedTypes can only be created by restricted-type-creator`,
			});
			await neo4jTest('RestrictedType', restrictedCode).notExists();
		});

		it('creates restricted record when using correct client-id', async () => {
			const { status } = await patchHandler()({
				type: 'RestrictedType',
				code: restrictedCode,
				metadata: {
					clientId: 'restricted-type-creator',
				},
			});

			expect(status).toBe(201);
			await neo4jTest('RestrictedType', restrictedCode).exists();
		});
	});

	describe('rich relationship information', () => {
		const someProp = 'some property';
		const anotherProp = 'another property';
		const queries = {
			relationshipAction: 'merge',
			richRelationships: true,
		};

		const childRelationshipProps = { code: childCode, someProp };
		const childRelationshipTwoProps = {
			code: childCode,
			someProp,
			anotherProp,
		};
		const child2RelationshipProps = {
			code: childCode2,
			anotherProp,
		};
		const parentRelationshipProps = { code: parentCode, anotherProp };

		it('returns record with rich relationship information if richRelationships query is true', async () => {
			await createNodes(
				['ChildType', childCode],
				['ParentType', parentCode],
			);

			const { body, status } = await basicHandler(
				{ children: childCode, parents: parentCode },
				{ relationshipAction: 'merge', richRelationships: true },
			);

			expect(status).toBe(201);
			body.children.forEach(relationship =>
				expect(relationship).toMatchObject({
					code: childCode,
					...meta.create,
				}),
			);
			body.parents.forEach(relationship =>
				expect(relationship).toMatchObject({
					code: parentCode,
					...meta.create,
				}),
			);
		});

		it('creates record with relationship which has properties (one child one prop)', async () => {
			await createNodes(['ChildType', childCode]);
			const { status, body } = await basicHandler(
				{ children: [childRelationshipProps] },
				queries,
			);

			expect(status).toBe(201);
			expect(body).toMatchObject({
				children: [{ ...childRelationshipProps, ...meta.create }],
			});

			await neo4jTest('MainType', mainCode)
				.match(meta.create)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: { someProp, ...meta.create },
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...meta.default },
					},
				);
		});

		it('creates record with relationship which has properties (one child two props)', async () => {
			await createNodes(['ChildType', childCode]);
			const { status, body } = await basicHandler(
				{ children: [childRelationshipTwoProps] },
				queries,
			);

			expect(status).toBe(201);
			expect(body).toMatchObject({
				children: [{ ...childRelationshipTwoProps, ...meta.create }],
			});

			await neo4jTest('MainType', mainCode)
				.match(meta.create)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: { someProp, anotherProp, ...meta.create },
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...meta.default },
					},
				);
		});

		it('creates record with relationship which has properties (two children)', async () => {
			await createNodes(
				['ChildType', childCode],
				['ChildType', childCode2],
			);
			const { status, body } = await basicHandler(
				{
					children: [childRelationshipProps, child2RelationshipProps],
				},
				queries,
			);

			expect(status).toBe(201);
			expect(body).toMatchObject({
				children: [
					{ ...childRelationshipProps, ...meta.create },
					{ ...child2RelationshipProps, ...meta.create },
				],
			});

			await neo4jTest('MainType', mainCode)
				.match(meta.create)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: { someProp, ...meta.create },
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...meta.default },
					},
				)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: { anotherProp, ...meta.create },
					},
					{
						type: 'ChildType',
						props: { code: childCode2, ...meta.default },
					},
				);
		});

		it('creates record with relationship which has properties (child and parent)', async () => {
			await createNodes(
				['ChildType', childCode],
				['ParentType', parentCode],
			);
			const { status, body } = await basicHandler(
				{
					children: [childRelationshipProps],
					parents: [parentRelationshipProps],
				},
				queries,
			);

			expect(status).toBe(201);
			expect(body).toMatchObject({
				children: [{ ...childRelationshipProps, ...meta.create }],
				parents: [{ ...parentRelationshipProps, ...meta.create }],
			});

			await neo4jTest('MainType', mainCode)
				.match(meta.create)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: { someProp, ...meta.create },
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...meta.default },
					},
				)
				.hasRel(
					{
						type: 'IS_PARENT_OF',
						direction: 'incoming',
						props: { anotherProp, ...meta.create },
					},
					{
						type: 'ParentType',
						props: { code: parentCode, ...meta.default },
					},
				);
		});

		it('creates record with relationships which has a property and also no property', async () => {
			await createNodes(
				['ChildType', childCode],
				['ParentType', parentCode],
			);
			const { status, body } = await basicHandler(
				{
					children: [childRelationshipProps],
					parents: [parentCode],
				},
				queries,
			);

			expect(status).toBe(201);
			expect(body).toMatchObject({
				children: [{ ...childRelationshipProps, ...meta.create }],
				parents: [{ code: parentCode, ...meta.create }],
			});

			await neo4jTest('MainType', mainCode)
				.match(meta.create)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: { someProp, ...meta.create },
					},
					{
						type: 'ChildType',
						props: { code: childCode, ...meta.default },
					},
				)
				.hasRel(
					{
						type: 'IS_PARENT_OF',
						direction: 'incoming',
						props: { ...meta.create },
					},
					{
						type: 'ParentType',
						props: { code: parentCode, ...meta.default },
					},
				);
		});
	});
});
