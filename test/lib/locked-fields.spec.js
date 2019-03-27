const schema = require('@financial-times/biz-ops-schema');

const {
	mergeLockedFields,
	validateLockedFields,
	setLockedFields,
	removeLockedFields,
	LockedFieldsError,
} = require('../../server/lib/locked-fields');

describe('locked fields', () => {
	let existingLockedFields;

	beforeEach(() => {
		existingLockedFields = {
			code: 'biz-ops-admin',
			name: 'biz-ops-admin',
		};
	});

	describe('setLockedFields', () => {
		const clientId = 'biz-ops-admin';
		const lockFields = ['code', 'name'];

		beforeEach(() => {
			jest.spyOn(schema, 'getType');
			schema.getType.mockReturnValue({
				properties: { code: {}, name: {}, teams: {} },
			});
		});

		it('throws an error when clientId is not set', () => {
			expect(() =>
				setLockedFields(undefined, lockFields, undefined),
			).toThrow(
				'clientId needs to be set to a valid system code in order to lock fields',
			);
		});

		it('returns a JSON string containing fieldname and clientId objects', () => {
			const response = '{"code":"biz-ops-admin","name":"biz-ops-admin"}';
			expect(setLockedFields(clientId, lockFields, undefined)).toEqual(
				response,
			);
		});

		it('returns a JSON string containing an object of all fieldname properties and values', () => {
			const allLockedFields = ['code', 'name', 'teams'];
			const response =
				'{"code":"biz-ops-admin","name":"biz-ops-admin","teams":"biz-ops-admin"}';
			expect(
				setLockedFields(clientId, allLockedFields, undefined),
			).toEqual(response);
		});

		it('adds new locked fields to the already existing locked fields', () => {
			const response =
				'{"teams":"biz-ops-admin","code":"biz-ops-admin","name":"biz-ops-admin"}';
			expect(
				setLockedFields(clientId, ['teams'], existingLockedFields),
			).toEqual(response);
		});

		it('does not duplicate locked field values', () => {
			const response = JSON.stringify(existingLockedFields);
			expect(
				setLockedFields(clientId, lockFields, existingLockedFields),
			).toEqual(response);
		});
	});

	describe('removeLockedFields', () => {
		const unlockFields = ['name'];

		it('returns undefined when no existingLockedFields exists', () => {
			expect(removeLockedFields(unlockFields, undefined)).toEqual(
				undefined,
			);
		});

		it('returns _lockedFields without the fields that have been unlocked', () => {
			expect(
				removeLockedFields(unlockFields, existingLockedFields),
			).toEqual('{"code":"biz-ops-admin"}');
		});

		it('returns _lockedFields without any fields when all fields are unlocked', () => {
			unlockFields.push('code');
			expect(
				removeLockedFields(unlockFields, existingLockedFields),
			).toEqual(null);
		});
	});

	describe('mergeLockedFields', () => {
		const clientId = 'biz-ops-admin';
		const nodeType = 'Person';

		describe('locked fields', () => {
			it('returns locked fields', () => {
				const query = { lockFields: 'code,name' };
				const response =
					'{"code":"biz-ops-admin","name":"biz-ops-admin"}';
				expect(
					mergeLockedFields(nodeType, clientId, query, undefined),
				).toEqual(response);
			});

			it('adds new lockedfields to exisiting lockedfields', () => {
				const newClientId = 'newClientId';
				const query = { lockFields: 'description' };
				const response =
					'{"description":"newClientId","code":"biz-ops-admin","name":"biz-ops-admin"}';
				expect(
					mergeLockedFields(
						nodeType,
						newClientId,
						query,
						existingLockedFields,
					),
				).toEqual(response);
			});
		});

		describe('unlocked fields', () => {
			const query = { unlockFields: 'name' };

			it('returns no lockedFields', () => {
				expect(
					mergeLockedFields(nodeType, clientId, query, undefined),
				).toEqual(undefined);
			});

			it('returns _lockedFields without the fields that have been unlocked', () => {
				expect(
					mergeLockedFields(
						nodeType,
						clientId,
						query,
						existingLockedFields,
					),
				).toEqual('{"code":"biz-ops-admin"}');
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
