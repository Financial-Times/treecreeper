const { createPublisher } = require('..');
const { Adaptor } = require('../../api-publish-adaptors');

class MockAdaptor extends Adaptor {
	constructor(pluckFields = []) {
		super(console);
		this._pluckFields = pluckFields;

		this.publish = jest.fn(async payload => payload);
	}
}

describe('publisher', () => {
	const createMockAdaptor = ({ pluckFields } = {}) =>
		new MockAdaptor(pluckFields);

	const defaultPayload = {
		action: 'test-action',
		code: 'api-publish',
		type: 'MainType',
		updatedProperties: ['someString'],
	};
	const createPayload = (...lackFields) =>
		Object.keys(defaultPayload).reduce((payload, field) => {
			if (!lackFields.includes(field)) {
				payload[field] = defaultPayload[field];
			}
			return payload;
		}, {});

	describe('Interface satisfaction', () => {
		it("throw error if adaptor doesn't extend Adaptor", async () => {
			const adaptor = {
				publish: async payload => payload,
			};
			expect(() => createPublisher(adaptor)).toThrow(
				/must be extended Adaptor/,
			);
		});
	});

	describe('missing fields in payload', () => {
		it('payload satisfies all fields', async () => {
			const adaptor = createMockAdaptor();
			const publisher = createPublisher(adaptor);
			await publisher.publish(createPayload());
			expect(adaptor.publish).toHaveBeenCalledWith({
				...defaultPayload,
				time: expect.any(Number),
			});
		});

		it("write warning log if payload doesn't have required fields", async () => {
			const adaptor = createMockAdaptor();
			const publisher = createPublisher(adaptor);
			await publisher.publish(createPayload('action'));
			expect(adaptor.publish).toHaveBeenCalledWith({
				...defaultPayload,
				action: undefined,
				time: expect.any(Number),
			});
		});

		it("write wrning log if payload doens't have required fields which is extended by adaptor", async () => {
			const adaptor = createMockAdaptor({ pluckFields: ['extended'] });
			const publisher = createPublisher(adaptor);
			await publisher.publish(createPayload());
			expect(adaptor.publish).toHaveBeenCalledWith({
				...defaultPayload,
				time: expect.any(Number),
			});
		});
	});
});
