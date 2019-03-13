const schema = require('@financial-times/biz-ops-schema');

const {
	mergeLockedFields,
	validateLockedFields,
	LockedFieldsError,
} = require('../../server/lib/locked-fields');

const existingLockedFields = {
	code: 'biz-ops-admin',
	name: 'biz-ops-admin',
};

describe('mergeLockedFields', () => {
	const nodeType = 'Person';
	const lockFields = 'code,name';
	const clientId = 'biz-ops-admin';

	beforeEach(() => {
		jest.spyOn(schema, 'getType');
		schema.getType.mockReturnValue({
			properties: { code: {}, name: {}, teams: {} },
		});
	});

	it('throws an error when clientId is not set', () => {
		expect(() =>
			mergeLockedFields(nodeType, undefined, lockFields, undefined),
		).toThrow(
			'clientId needs to be set to a valid system code in order to lock fields',
		);
	});

	it('returns a JSON string containing fieldname and clientId objects', () => {
		const response = '{"code":"biz-ops-admin","name":"biz-ops-admin"}';
		expect(
			mergeLockedFields(nodeType, clientId, lockFields, undefined),
		).toEqual(response);
	});

	it('returns a JSON string containing an array of all fieldname properties and values', () => {
		const response =
			'{"code":"biz-ops-admin","name":"biz-ops-admin","teams":"biz-ops-admin"}';
		expect(mergeLockedFields(nodeType, clientId, 'all', undefined)).toEqual(
			response,
		);
	});

	it('adds new locked fields to the already existing locked fields', () => {
		const response =
			'{"teams":"biz-ops-admin","code":"biz-ops-admin","name":"biz-ops-admin"}';
		expect(
			mergeLockedFields(
				nodeType,
				clientId,
				'teams',
				existingLockedFields,
			),
		).toEqual(response);
	});

	it('does not duplicate locked field values', () => {
		const response = JSON.stringify(existingLockedFields);
		expect(
			mergeLockedFields(
				nodeType,
				clientId,
				lockFields,
				existingLockedFields,
			),
		).toEqual(response);
	});
});

describe('validateLockedFields', () => {
	let clientId = 'clientId';
	let propertiesToModify = { code: 'code', name: 'name' };

	it('throws an error when field is locked by another client', () => {
		expect(() =>
			validateLockedFields(
				clientId,
				propertiesToModify,
				existingLockedFields,
			),
		).toThrow(LockedFieldsError);
	});

	it('does NOT throw an error when field is NOT locked', () => {
		propertiesToModify = { isActive: true, email: 'email@example.com' };
		expect(() =>
			validateLockedFields(
				clientId,
				propertiesToModify,
				existingLockedFields,
			),
		).not.toThrow(LockedFieldsError);
	});

	it('does NOT throw an error when field is locked by current client', () => {
		clientId = 'biz-ops-admin';
		propertiesToModify = { name: 'new name' };
		expect(() =>
			validateLockedFields(
				clientId,
				propertiesToModify,
				existingLockedFields,
			),
		).not.toThrow(LockedFieldsError);
	});
});
