const schema = require('@financial-times/biz-ops-schema');

const { mergeLockedFields } = require('../../server/lib/locked-fields');

describe('lockedFields', () => {
	let existingLockedFields;

	beforeEach(() => {
		existingLockedFields = {
			code: 'biz-ops-admin',
			name: 'biz-ops-admin',
		};
	});

	describe('mergeLockedFields', () => {
		const clientId = 'biz-ops-admin';
		const nodeType = 'Person';

		describe('setLockedFields', () => {
			beforeEach(() => {
				jest.spyOn(schema, 'getType');
				schema.getType.mockReturnValue({
					properties: { code: {}, name: {}, teams: {} },
				});
			});

			it('throws an error when clientId is not set', () => {
				expect(() =>
					mergeLockedFields({ nodeType, lockFields: 'code,name' }),
				).toThrow(
					'clientId needs to be set to a valid system code in order to lock fields',
				);
			});

			it('returns a JSON string containing fieldname and clientId objects', () => {
				const call = mergeLockedFields({
					nodeType,
					clientId,
					lockFields: 'code,name',
				});
				const response =
					'{"code":"biz-ops-admin","name":"biz-ops-admin"}';
				expect(call).toEqual(response);
			});

			it('returns a JSON string containing an object of all fieldname properties and values', () => {
				const call = mergeLockedFields({
					nodeType,
					clientId,
					lockFields: 'all',
				});
				const response =
					'{"code":"biz-ops-admin","name":"biz-ops-admin","teams":"biz-ops-admin"}';
				expect(call).toEqual(response);
			});

			it('adds new locked fields to the already existing locked fields', () => {
				const call = mergeLockedFields({
					nodeType,
					clientId,
					lockFields: 'teams',
					existingLockedFields,
				});
				const response =
					'{"code":"biz-ops-admin","name":"biz-ops-admin","teams":"biz-ops-admin"}';
				expect(call).toEqual(response);
			});

			it('does not duplicate locked field values', () => {
				const call = mergeLockedFields({
					nodeType,
					clientId,
					lockFields: 'code,name',
					existingLockedFields,
				});
				const response = JSON.stringify(existingLockedFields);
				expect(call).toEqual(response);
			});
		});

		describe('removeLockedFields', () => {
			it('returns null when no existingLockedFields exists', () => {
				const call = mergeLockedFields({
					nodeType,
					clientId,
					unlockFields: 'name',
				});
				expect(call).toEqual(null);
			});

			it('returns _lockedFields without the fields that have been unlocked', () => {
				const call = mergeLockedFields({
					nodeType,
					clientId,
					unlockFields: 'name',
					existingLockedFields,
				});
				expect(call).toEqual('{"code":"biz-ops-admin"}');
			});

			it('returns _lockedFields without any fields when all fields are unlocked', () => {
				const call = mergeLockedFields({
					nodeType,
					clientId,
					unlockFields: 'all',
					existingLockedFields,
				});
				expect(call).toEqual(null);
			});
		});
	});
});
