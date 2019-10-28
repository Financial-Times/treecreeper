const { logChanges } = require('..');
const { setupMocks } = require('../../../test-helpers');

describe('logChanges', () => {
	const namespace = 'api-publish-log-changes';
	const mainCode = `${namespace}-main`;
	const mainType = 'MainType';

	const { createNode, driver } = setupMocks(namespace);

	const createMockAdaptor = () => ({
		getName: () => 'mock-adaptor',
		publish: jest.fn(async payload => payload),
	});

	const createMainNode = (props = {}) =>
		createNode(mainType, Object.assign({ code: mainCode }, props));

	const findNode = code => {
		const query = `MATCH (node:${mainType} { code: $code })
			OPTIONAL MATCH (node)-[relationship]-(related)
			RETURN node, relationship, labels(related) AS relatedLabels, related.code AS relatedCode, related._createdByRequest AS relatedRequestId`;
		return driver.session().run(query, { code });
	};

	describe('DELETE', () => {
		it('DELETE event should be sent with deleted properties', async () => {
			await createMainNode();
			const result = findNode(mainCode);
			const adaptor = createMockAdaptor;
			await logChanges('DELETE', result);
			expect(adaptor.publish).toHaveBeenCalledTimes(1);
		});
	});

	describe('CREATE', () => {
		it('CREATE event should be sent with created properties', async () => {
			// TODO: test
		});
		it('UPDATE event should be sent with related properties', async () => {
			// TODO: test
		});
		it('CREATE event should be sent with related properties when upserted', async () => {
			// TODO: test
		});
	});

	describe('UPDATE', () => {
		it('UPDATE event should be sent with updated properties', async () => {
			// TODO: test
		});
		it('UPDATE event should be sent with related properties', async () => {
			// TODO: test
		});
		it('CREATE event should be sent with related properties when upserted', async () => {
			// TODO: test
		});
	});
});
