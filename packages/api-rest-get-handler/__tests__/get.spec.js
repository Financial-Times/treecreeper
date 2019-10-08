const { getHandler } = require('..');

const { setupMocks } = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest GET', () => {
	const sandbox = {};

	const namespace = 'api-rest-get-handler';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'MainType',
		code: mainCode,
	};

	setupMocks(sandbox, { namespace });

	securityTests(getHandler(), mainCode);

	it('gets record without relationships', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
		});
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toEqual(
			sandbox.addMeta({
				code: mainCode,
				someString: 'name1',
			}),
		);
	});

	it('gets record with relationships', async () => {
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

		const { body, status } = await getHandler()(input);
		expect(status).toBe(200);
		expect(body).toEqual(
			sandbox.addMeta({
				code: mainCode,
				parents: [`${namespace}-parent`],
				children: [`${namespace}-child`],
			}),
		);
	});

	it('gets record with Documents', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
		});

		const { body, status } = await getHandler({
			documentStore: {
				get: jest.fn(async () => ({
					someDocument: 'document',
				})),
			},
		})(input);

		expect(status).toBe(200);
		expect(body).toEqual(
			sandbox.addMeta({
				code: mainCode,
				someDocument: 'document',
			}),
		);
	});

	it('throws 404 error if no record', async () => {
		await expect(getHandler()(input)).rejects.toThrow({
			status: 404,
			message: `MainType ${mainCode} does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(getHandler()(input)).rejects.toThrow('oh no');
	});

	it('throws if s3 query fails', async () => {
		await expect(
			getHandler({
				documentStore: {
					get: asyncErrorFunction,
				},
			})(input),
		).rejects.toThrow('oh no');
	});
});
