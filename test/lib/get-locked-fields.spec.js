const schema = require('@financial-times/biz-ops-schema');

const getLockedFields = require('../../server/lib/get-locked-fields');

describe('Get lockedFields', () => {
	let lockFields = 'code,name';
	const nodeType = 'Person';

	beforeEach(() => {
		jest.spyOn(schema, 'getType');
	});

	it('throws an error when clientId is not set', () => {
		const clientId = undefined;
		expect(() => getLockedFields(nodeType, clientId, lockFields)).toThrow(
			Error,
		);
	});

	it('returns a JSON string containing an array of objects with clientId and fieldname properties and values', () => {
		schema.getType.mockReturnValue({
			properties: { code: {}, name: {}, teams: {} },
		});
		const clientId = 'biz-ops-api';
		const response =
			'[{"fieldName":"code","clientId":"biz-ops-api"},{"fieldName":"name","clientId":"biz-ops-api"}]';
		expect(getLockedFields(nodeType, clientId, lockFields)).toEqual(
			response,
		);
	});

	it('returns a JSON string containing an array of all fieldname properties and values', () => {
		schema.getType.mockReturnValue({
			properties: { code: {}, name: {}, teams: {} },
		});
		const clientId = 'biz-ops-api';
		lockFields = 'all';
		const response =
			'[{"fieldName":"code","clientId":"biz-ops-api"},{"fieldName":"name","clientId":"biz-ops-api"},{"fieldName":"teams","clientId":"biz-ops-api"}]';
		expect(getLockedFields(nodeType, clientId, lockFields)).toEqual(
			response,
		);
	});
});
