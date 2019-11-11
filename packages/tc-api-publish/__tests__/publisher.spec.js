const { createPublisher } = require('..');

describe('publisher', () => {
	const createMockAdaptor = ({ pluckFields } = {}) => {
		const adaptor = {
			getName: jest.fn(() => 'mock-adaptor'),
			publish: jest.fn(async payload => payload),
		};
		if (pluckFields) {
			adaptor.pluckFields = jest.fn(() => pluckFields);
		}
		return adaptor;
	};
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
		it('throw error if missing `publish` method', async () => {
			const adaptor = {
				getName: () => 'example-adaptor',
			};
			expect(() => createPublisher(adaptor)).toThrow(
				/Interface satisfaction error/,
			);
		});

		it('throw error if missing `getName` method', async () => {
			const adaptor = {
				publish: async payload => payload,
			};
			expect(() => createPublisher(adaptor)).toThrow(
				/Interface satisfaction error/,
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
			expect(adaptor.getName).toHaveBeenCalled();
		});

		it("write wrning log if payload doens't have required fields which is extended by adaptor", async () => {
			const adaptor = createMockAdaptor({ pluckFields: ['extended'] });
			const publisher = createPublisher(adaptor);
			await publisher.publish(createPayload());
			expect(adaptor.publish).toHaveBeenCalledWith({
				...defaultPayload,
				time: expect.any(Number),
			});
			expect(adaptor.getName).toHaveBeenCalled();
		});
	});
});
