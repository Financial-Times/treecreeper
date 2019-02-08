const getLockedFields = require('../../server/lib/get-locked-fields');

describe('Get lockedFields', () => {
	const lockFields = 'code,name';

	it('throws an error when clientId is not set', () => {
		const clientId = undefined;
		expect(() => getLockedFields(clientId, lockFields)).toThrow(Error);
	});

	it('returns a JSON string containing an array of objects with clientId and fieldname properties and values', () => {
		const clientId = 'biz-ops-api';
		const response =
			'[{"fieldName":"code","clientId":"biz-ops-api"},{"fieldName":"name","clientId":"biz-ops-api"}]';
		expect(getLockedFields(clientId, lockFields)).toEqual(response);
	});
});
