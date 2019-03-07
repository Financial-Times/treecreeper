const schema = require('@financial-times/biz-ops-schema');
const { LockedFieldsError } = require('../../server/lib/error-handling');

const {
	getLockedFields,
	validateFields,
} = require('../../server/lib/locked-fields');

describe('getLockedFields', () => {
	const nodeType = 'Person';
	const lockFields = 'code,name';
	const clientId = 'biz-ops-api';

	beforeEach(() => {
		jest.spyOn(schema, 'getType');
		schema.getType.mockReturnValue({
			properties: { code: {}, name: {}, teams: {} },
		});
	});

	it('throws an error when clientId is not set', () => {
		expect(() => getLockedFields(nodeType, undefined, lockFields)).toThrow(
			'clientId needs to be set in order to lock fields',
		);
	});

	it('returns a JSON string containing an array of objects with clientId and fieldname properties and values', () => {
		const response =
			'[{"fieldName":"code","clientId":"biz-ops-api"},{"fieldName":"name","clientId":"biz-ops-api"}]';
		expect(
			getLockedFields(nodeType, clientId, lockFields, undefined),
		).toEqual(response);
	});

	it('returns a JSON string containing an array of all fieldname properties and values', () => {
		const response =
			'[{"fieldName":"code","clientId":"biz-ops-api"},{"fieldName":"name","clientId":"biz-ops-api"},{"fieldName":"teams","clientId":"biz-ops-api"}]';
		expect(getLockedFields(nodeType, clientId, 'all')).toEqual(response);
	});

	it('adds new locked fields to the already existing locked fields', () => {
		const existingLockedFields =
			'[{"fieldName":"code","clientId":"biz-ops-api"},{"fieldName":"name","clientId":"biz-ops-api"}]';
		const response =
			'[{"fieldName":"code","clientId":"biz-ops-api"},{"fieldName":"name","clientId":"biz-ops-api"},{"fieldName":"teams","clientId":"biz-ops-api"}]';
		expect(
			getLockedFields(nodeType, clientId, 'teams', existingLockedFields),
		).toEqual(response);
	});

	it('does not duplicate locked field values', () => {
		const existingLockedFields =
			'[{"fieldName":"code","clientId":"biz-ops-api"},{"fieldName":"name","clientId":"biz-ops-api"}]';
		expect(
			getLockedFields(
				nodeType,
				clientId,
				lockFields,
				existingLockedFields,
			),
		).toEqual(existingLockedFields);
	});
});

describe('validateLockedFields', () => {
	const lockedFields =
		'[{"fieldName":"code","clientId":"biz-ops-admin"},{"fieldName":"name","clientId":"biz-ops-admin"}]';
	let clientId = 'clientId';
	let writeProperties = { code: 'code', name: 'name' };

	it('throws an error when field is locked by another client', () => {
		expect(() =>
			validateFields(lockedFields, clientId, writeProperties),
		).toThrow(LockedFieldsError);
	});

	it('does not throw an error when field is NOT locked', () => {
		writeProperties = { isActive: true };
		expect(() =>
			validateFields(lockedFields, clientId, writeProperties),
		).not.toThrow(LockedFieldsError);
	});

	it('does NOT throw an error when field is locked by current client', () => {
		clientId = 'biz-ops-admin';
		expect(() =>
			validateFields(lockedFields, clientId, writeProperties),
		).not.toThrow(LockedFieldsError);
	});
});
