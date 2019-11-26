const jsforce = require('jsforce');
const dbConnection = require('@financial-times/tc-api-db-manager');
const salesforceSync = require('../server/lib/salesforce');

/* eslint no-use-before-define: "warn" */
const loginStub = jest.fn(() => Promise.resolve(new JsforceConnection()));

const createStub = jest.fn(() => Promise.resolve({ id: 'test-id' }));

const sobjectStub = jest.fn().mockReturnValue({
	create: createStub,
});

/* eslint-disable class-methods-use-this */
class JsforceConnection {
	login(...args) {
		return loginStub(...args);
	}

	sobject(...args) {
		return sobjectStub(...args);
	}
}
/* eslint-enable class-methods-use-this */

jsforce.Connection = jest.fn(() => new JsforceConnection());

jest.spyOn(dbConnection, 'executeQuery').mockReturnValue(Promise.resolve('ok'));

describe('salesforce sync unit', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});
	afterEach(() => {
		jest.clearAllMocks();
	});

	it("doesn't call if no salesforce user defined", async () => {
		await salesforceSync.setSalesforceIdForSystem({ code: 'elephants' });
		expect(loginStub).not.toHaveBeenCalled();
	});

	describe('when salesforce user defined', () => {
		beforeAll(() => {
			process.env.SALESFORCE_USER = 'test-sf-user';
			process.env.SALESFORCE_PASSWORD = 'test-sf-password';
			process.env.SALESFORCE_TOKEN = 'test-sf-token';
		});

		it("doesn't call if not create  biz-ops", async () => {
			await salesforceSync.setSalesforceIdForSystem({
				action: 'CREATE',
				code: 'elephants',
			});
			expect(loginStub).not.toHaveBeenCalled();
		});

		it('logs in to salesforce', async () => {
			await salesforceSync.setSalesforceIdForSystem({
				action: 'CREATE',
				code: 'elephants',
			});
			expect(loginStub).toHaveBeenCalledWith(
				'test-sf-user',
				'test-sf-passwordtest-sf-token',
			);
		});

		it('calls with minimal set of data to create System', async () => {
			await salesforceSync.setSalesforceIdForSystem({
				action: 'CREATE',
				code: 'elephants',
				name: 'We Elephants',
			});
			expect(sobjectStub).toHaveBeenCalledWith(
				'BMCServiceDesk__BMC_BaseElement__c',
			);
			expect(createStub).toHaveBeenCalledWith({
				BMCServiceDesk__Description__c:
					'See https://dewey.in.ft.com/view/system/elephants',
				BMCServiceDesk__Name__c: 'We Elephants',
				BMCServiceDesk__TokenId__c: 'We Elephants',
				Name: 'We Elephants',
				RecordTypeId: '012D0000000Qn40IAC',
				System_Code__c: 'elephants',
			});
		});
		it('uses code if no name specified', async () => {
			await salesforceSync.setSalesforceIdForSystem({
				action: 'CREATE',
				code: 'elephants',
			});
			expect(sobjectStub).toHaveBeenCalledWith(
				'BMCServiceDesk__BMC_BaseElement__c',
			);
			expect(createStub).toHaveBeenCalledWith({
				BMCServiceDesk__Description__c:
					'See https://dewey.in.ft.com/view/system/elephants',
				BMCServiceDesk__Name__c: 'elephants',
				BMCServiceDesk__TokenId__c: 'elephants',
				Name: 'elephants',
				RecordTypeId: '012D0000000Qn40IAC',
				System_Code__c: 'elephants',
			});
		});
		it('saves SF_ID to system', async () => {
			const patchHandlerSpy = jest.fn();
			await salesforceSync.setSalesforceIdForSystem(
				{
					action: 'CREATE',
					code: 'elephants',
					name: 'We Elephants',
				},
				patchHandlerSpy,
			);
			expect(patchHandlerSpy).toHaveBeenCalledWith({
				body: { SF_ID: 'test-id' },
				metadata: { clientId: 'biz-ops-api' },
				code: 'elephants',
				type: 'System',
				query: { lockFields: 'SF_ID' },
			});
		});
	});
});
