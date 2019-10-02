const { getHandler } = require('..');

const { setupMocks } = require('../../../test-helpers');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest GET', () => {
	const sandbox = {};

	const namespace = 'get';
	const mainCode = `${namespace}-main`;

	setupMocks(sandbox, { namespace });

	it('gets node without relationships', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
		});
		const { body, status } = await getHandler()({
			type: 'MainType',
			code: mainCode,
		});

		expect(status).toBe(200);
		expect(body).toEqual(
			sandbox.addMeta({
				code: mainCode,
				someString: 'name1',
			}),
		);
	});

	it('gets node with relationships', async () => {
		const [main, child, parent] = await sandbox.createNodes(
			['MainType', mainCode],
			['ChildType', `${namespace}-child`],
			['ParentType', `${namespace}-parent`],
		);
		await sandbox.connectNodes(
			// tests incoming and outgoing relationships
			[main, 'HAS_CHILD', child],
			[parent, 'IS_PARENT_OF', main],
		);

		const { body, status } = await getHandler()({
			type: 'MainType',
			code: mainCode,
		});
		expect(status).toBe(200);
		expect(body).toEqual(
			sandbox.addMeta({
				code: mainCode,
				parents: [`${namespace}-parent`],
				children: [`${namespace}-child`],
			}),
		);
	});

	it('gets node with Documents', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
		});

		const { body, status } = await getHandler({
			documentStore: {
				get: jest.fn(async () => ({
					someDocument: 'document',
				})),
			},
		})({ type: 'MainType', code: mainCode });

		expect(status).toBe(200);
		expect(body).toEqual(
			sandbox.addMeta({
				code: mainCode,
				someDocument: 'document',
			}),
		);
	});

	it('throws 404 error if no node', async () => {
		await expect(
			getHandler()({
				type: 'MainType',
				code: mainCode,
			}),
		).rejects.toThrow({
			status: 404,
			message: `MainType ${mainCode} does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(
			getHandler()({
				type: 'MainType',
				code: mainCode,
			}),
		).rejects.toThrow('oh no');
	});

	it('throws if s3 query fails', async () => {
		await expect(
			getHandler({
				documentStore: {
					get: asyncErrorFunction,
				},
			})({
				type: 'MainType',
				code: mainCode,
			}),
		).rejects.toThrow('oh no');
	});

	describe('security', () => {
		// Example cypher query taken from https://stackoverflow.com/a/24317293/10917765
		const INJECTION_ATTACK_STRING =
			'"1 WITH count(1) AS dummy MATCH (u:User) OPTIONAL MATCH (u)-[r]-() DELETE u, r"';
		const vectors = {
			type: obj => {
				obj.type = INJECTION_ATTACK_STRING;
			},
			code: obj => {
				obj.code = INJECTION_ATTACK_STRING;
			},
			clientId: obj => {
				obj.metadata = { clientId: INJECTION_ATTACK_STRING };
			},
			clientUserId: obj => {
				obj.metadata = { clientUserId: INJECTION_ATTACK_STRING };
			},
			requestId: obj => {
				obj.metadata = { requestId: INJECTION_ATTACK_STRING };
			},
		};

		Object.entries(vectors).forEach(([name, modifier]) => {
			it(`should error when ${name} is suspicious`, async () => {
				const input = {
					type: 'MainType',
					code: mainCode,
				};
				modifier(input);
				await expect(getHandler()(input)).rejects.toThrow(
					expect.objectContaining({ status: 400 }),
				);
			});
		});

		// it('should error when node code is suspicious', async () => {
		// 	await expect(
		// 		getHandler()({
		// 			type: 'MainType',
		// 			code: INJECTION_ATTACK_STRING,
		// 		}),
		// 	).rejects.toThrow(
		// 		new RegExp(
		// 			`Invalid value \`${ESCAPED_INJECTION_ATTACK_STRING}\` for property \`code\` on type \`MainType\``,
		// 		),
		// 	);
		// });

		// it('should error when client id is suspicious', async () => {
		// 	await expect(
		// 		getHandler()({
		// 			type: 'MainType',
		// 			code: INJECTION_ATTACK_STRING,
		// 			metadata: {
		// 				clientId
		// 			}
		// 		}),
		// 	).rejects.toThrow(
		// 		new RegExp(
		// 			`Invalid value \`${ESCAPED_INJECTION_ATTACK_STRING}\` for property \`code\` on type \`MainType\``,
		// 		),
		// 	);

		// 	await request(app)
		// 		.get(restUrl)
		// 		.set('client-id', `${INJECTION_ATTACK_STRING}`)
		// 		.expect(
		// 			400,
		// 			new RegExp(
		// 				`Invalid client id \`${ESCAPED_INJECTION_ATTACK_STRING}\``,
		// 			),
		// 		);
		// });

		// it('should error when client user id is suspicious', async () => {
		// 	await request(app)
		// 		.get(restUrl)
		// 		.set('client-user-id', `${INJECTION_ATTACK_STRING}`)
		// 		.expect(
		// 			400,
		// 			new RegExp(
		// 				`Invalid client user id \`${ESCAPED_INJECTION_ATTACK_STRING}\``,
		// 			),
		// 		);
		// });

		// it('should error when request id is suspicious', async () => {
		// 	await request(app)
		// 		.get(restUrl)
		// 		.set('client-id', 'valid-id')
		// 		.set('x-request-id', `${INJECTION_ATTACK_STRING}`)
		// 		.expect(
		// 			400,
		// 			new RegExp(
		// 				`Invalid request id \`${ESCAPED_INJECTION_ATTACK_STRING}\``,
		// 			),
		// 		);
		// });
	});
});
