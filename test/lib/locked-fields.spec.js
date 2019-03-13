const schema = require('@financial-times/biz-ops-schema');

const {
	mergeLockedFields,
	validateLockedFields,
	unlockFields,
	LockedFieldsError,
} = require('../../server/lib/locked-fields');

const existingLockedFields = {
	code: 'biz-ops-admin',
	name: 'biz-ops-admin',
};

const nodeType = 'Person';

describe('mergeLockedFields', () => {
	const clientId = 'biz-ops-admin';
	const lockFields = 'code,name';

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

	it('returns a JSON string containing an object of all fieldname properties and values', () => {
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

describe('unlocksFields', () => {
	const clientId = 'clientId';
	let existingLockedFieldsString = '{"code":"clientId","name":"clientId"}';

	it('returns _lockedFields without the fields that have been unlocked', () => {
		const fieldnames = 'name';
		expect(
			unlockFields(
				nodeType,
				clientId,
				fieldnames,
				existingLockedFieldsString,
			),
		).toEqual('{"code":"clientId"}');
	});

	it('returns _lockedFields without any fields when all fields are unlocked', () => {
		const fieldnames = 'name,code';
		expect(
			unlockFields(
				nodeType,
				clientId,
				fieldnames,
				existingLockedFieldsString,
			),
		).toEqual('{}');
	});

	it('returns _lockedFields unchanged when clientIds do not match', () => {
		const differentClientId = 'another-api';
		const fieldnames = 'name,code';
		expect(
			unlockFields(
				nodeType,
				differentClientId,
				fieldnames,
				existingLockedFieldsString,
			),
		).toEqual(existingLockedFieldsString);
	});

	it('returns _lockedFields with fields that are not locked by the requesting clientId', () => {
		const fieldnames = 'name,code,email';
		existingLockedFieldsString =
			'{"code":"clientId","name":"clientId", "email": "another-api"}';
		expect(
			unlockFields(
				nodeType,
				clientId,
				fieldnames,
				existingLockedFieldsString,
			),
		).toEqual('{"email":"another-api"}');
	});
});
