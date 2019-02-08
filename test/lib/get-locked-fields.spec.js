const schema = require('@financial-times/biz-ops-schema');

const getLockedFields = require('../../server/lib/get-locked-fields');

describe('Get lockedFields', () => {
	let lockFields = 'code,name';

	beforeEach(() => {
		jest.spyOn(schema, 'getType');
	});

	it('throws an error when clientId is not set', () => {
		const clientId = undefined;
		expect(() => getLockedFields(clientId, lockFields)).toThrow(Error);
	});

	it('returns a JSON string containing an array of objects with clientId and fieldname properties and values', () => {
		schema.getType.mockReturnValue({
			properties: { code: {}, name: {}, teams: {} },
		});
		const clientId = 'biz-ops-api';
		const response =
			'[{"fieldName":"code","clientId":"biz-ops-api"},{"fieldName":"name","clientId":"biz-ops-api"}]';
		expect(getLockedFields(clientId, lockFields)).toEqual(response);
	});

	it('returns a JSON string containing an array of all fieldname properties and values', () => {
		schema.getType.mockReturnValue({
			properties: { code: {}, name: {}, teams: {} },
		});
		const clientId = 'biz-ops-api';
		lockFields = 'all';
		const nodeType = 'Person';
		const response =
			'fw[{"fieldName":"code","clientId":"biz-ops-api"},{"fieldName":"name","clientId":"biz-ops-api"},{"fieldName":"teams","clientId":"biz-ops-api"}]';
		expect(getLockedFields(clientId, lockFields, nodeType)).toEqual(
			response,
		);
	});
});
