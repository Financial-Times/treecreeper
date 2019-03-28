const schema = require('@financial-times/biz-ops-schema');

const {
	mergeLockedFields,
	validateLockedFields,
	LockedFieldsError,
} = require('../../server/lib/locked-fields');

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
			const query = { lockFields: 'code,name' };

			beforeEach(() => {
				jest.spyOn(schema, 'getType');
				schema.getType.mockReturnValue({
					properties: { code: {}, name: {}, teams: {} },
				});
			});

			it('throws an error when clientId is not set', () => {
				expect(() =>
					mergeLockedFields(nodeType, undefined, query, undefined),
				).toThrow(
					'clientId needs to be set to a valid system code in order to lock fields',
				);
			});

			it('returns a JSON string containing fieldname and clientId objects', () => {
				const call = mergeLockedFields(
					nodeType,
					clientId,
					query,
					undefined,
				);
				const response =
					'{"code":"biz-ops-admin","name":"biz-ops-admin"}';
				expect(call).toEqual(response);
			});

			it('returns a JSON string containing an object of all fieldname properties and values', () => {
				const queryAll = { lockFields: 'all' };
				const call = mergeLockedFields(
					nodeType,
					clientId,
					queryAll,
					undefined,
				);
				const response =
					'{"code":"biz-ops-admin","name":"biz-ops-admin","teams":"biz-ops-admin"}';
				expect(call).toEqual(response);
			});

			it('adds new locked fields to the already existing locked fields', () => {
				const queryTeams = { lockFields: 'teams' };
				const call = mergeLockedFields(
					nodeType,
					clientId,
					queryTeams,
					existingLockedFields,
				);
				const response =
					'{"teams":"biz-ops-admin","code":"biz-ops-admin","name":"biz-ops-admin"}';
				expect(call).toEqual(response);
			});

			it('does not duplicate locked field values', () => {
				const call = mergeLockedFields(
					nodeType,
					clientId,
					query,
					existingLockedFields,
				);
				const response = JSON.stringify(existingLockedFields);
				expect(call).toEqual(response);
			});
		});

		describe('removeLockedFields', () => {
			const query = { unlockFields: 'name' };

			it('returns undefined when no existingLockedFields exists', () => {
				const call = mergeLockedFields(
					nodeType,
					clientId,
					query,
					undefined,
				);
				expect(call).toEqual(undefined);
			});

			it('returns _lockedFields without the fields that have been unlocked', () => {
				const call = mergeLockedFields(
					nodeType,
					clientId,
					query,
					existingLockedFields,
				);
				expect(call).toEqual('{"code":"biz-ops-admin"}');
			});

			it('returns _lockedFields without any fields when all fields are unlocked', () => {
				const queryAll = { unlockFields: 'all' };
				const call = mergeLockedFields(
					nodeType,
					clientId,
					queryAll,
					existingLockedFields,
				);
				expect(call).toEqual(null);
			});
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
});
