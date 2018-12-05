const salesforceSync = require('../../server/lib/salesforce-sync');

/* eslint no-use-before-define: "warn" */
const loginStub = jest.fn(() => Promise.resolve(new JsforceConnection()));

const createStub = jest.fn(() => Promise.resolve({ id: 'test-id' }));

const sobjectStub = jest.fn().mockReturnValue({
	create: createStub
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

const jsforce = require('jsforce');

jsforce.Connection = jest.fn(() => new JsforceConnection());

const dbConnection = require('../../server/data/db-connection');

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
		expect(loginStub).not.called;
	});

	describe('when salesforce user defined', () => {
		beforeAll(() => {
			process.env.SALESFORCE_USER = 'test-sf-user';
			process.env.SALESFORCE_PASSWORD = 'test-sf-password';
			process.env.SALESFORCE_TOKEN = 'test-sf-token';
		});

		it("doesn't call if SF_ID already exists in biz-ops", async () => {
			await salesforceSync.setSalesforceIdForSystem({
				code: 'elephants',
				SF_ID: '12345'
			});
			expect(loginStub).not.called;
		});

		it('logs in to salesforce', async () => {
			await salesforceSync.setSalesforceIdForSystem({ code: 'elephants' });
			expect(loginStub).toHaveBeenCalledWith(
				'test-sf-user',
				'test-sf-passwordtest-sf-token'
			);
		});

		it('calls with minimal set of data to create System', async () => {
			await salesforceSync.setSalesforceIdForSystem({
				code: 'elephants',
				name: 'We Elephants'
			});
			expect(sobjectStub).toHaveBeenCalledWith(
				'BMCServiceDesk__BMC_BaseElement__c'
			);
			expect(createStub).toHaveBeenCalledWith({
				BMCServiceDesk__Description__c:
					'See https://dewey.in.ft.com/view/system/elephants',
				BMCServiceDesk__Name__c: 'We Elephants',
				BMCServiceDesk__TokenId__c: 'We Elephants',
				Name: 'We Elephants',
				RecordTypeId: '012D0000000Qn40IAC',
				System_Code__c: 'elephants'
			});
		});
		it('uses code if no name specified', async () => {
			await salesforceSync.setSalesforceIdForSystem({
				code: 'elephants'
			});
			expect(sobjectStub).toHaveBeenCalledWith(
				'BMCServiceDesk__BMC_BaseElement__c'
			);
			expect(createStub).toHaveBeenCalledWith({
				BMCServiceDesk__Description__c:
					'See https://dewey.in.ft.com/view/system/elephants',
				BMCServiceDesk__Name__c: 'elephants',
				BMCServiceDesk__TokenId__c: 'elephants',
				Name: 'elephants',
				RecordTypeId: '012D0000000Qn40IAC',
				System_Code__c: 'elephants'
			});
		});
		it('saves SF_ID to system', async () => {
			await salesforceSync.setSalesforceIdForSystem({
				code: 'elephants',
				name: 'We Elephants'
			});
			expect(dbConnection.executeQuery).toHaveBeenCalledWith(
				'MATCH (s:System {code: $code}) SET s.SF_ID = $SF_ID RETURN s',
				{ code: 'elephants', SF_ID: 'test-id' }
			);
		});
	});
});
