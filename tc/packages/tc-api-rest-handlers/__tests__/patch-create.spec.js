const { setupMocks } = require('../../../test-helpers');

jest.mock('../post', () => ({
	postHandler: jest.fn(),
}));
const { patchHandler: patchHandlerFactory } = require('../patch');

const postModule = require('../post');

const mockPostHandler = jest.fn();
mockPostHandler.mockResolvedValue({
	status: 200,
	body: { code: 'testing' },
});
postModule.postHandler.mockImplementation(() => mockPostHandler);

const patchHandler = patchHandlerFactory();

describe('rest PATCH create', () => {
	const namespace = 'api-rest-handlers-patch-create';
	const branchCode = `${namespace}-branch`;

	const { createNode } = setupMocks(namespace);

	beforeEach(() => mockPostHandler.mockClear());
	it("uses post handler when record doesn't exist", async () => {
		const input = {
			type: 'SimpleGraphBranch',
			code: branchCode,
		};
		const { status, body } = await patchHandler(input);

		expect(status).toBe(201);
		expect(body).toMatchObject({
			code: 'testing',
		});
		expect(mockPostHandler).toHaveBeenCalledWith(input);
	});
	it('does not use post handler when record does exist', async () => {
		await createNode('SimpleGraphBranch', {
			code: branchCode,
			stringProperty: 'name1',
		});
		const input = {
			type: 'SimpleGraphBranch',
			code: branchCode,
		};
		const { status, body } = await patchHandler(input);

		expect(status).toBe(200);
		expect(body).toMatchObject({
			code: branchCode,
			stringProperty: 'name1',
		});
		expect(mockPostHandler).not.toHaveBeenCalledWith(input);
	});
});
