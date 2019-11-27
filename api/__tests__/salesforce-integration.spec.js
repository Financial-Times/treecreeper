const salesforceSync = require('../server/lib/salesforce');
const createApp = require('../server/app.js');

let app;
const namespace = 'salesforce-sync';
const { dropDb } = require('./helpers/test-data');
const { setupMocks } = require('./helpers');

<<<<<<< HEAD
// can't test against the test schema - very biz ops specific
describe.skip('salesforce sync integration', () => {
=======
describe('salesforce sync integration', () => {
>>>>>>> d4639caaacc83ea3757711c96c9b42ef90291fef
	beforeAll(async () => {
		app = await createApp();
	});
	beforeEach(async () => {
		dropDb(namespace);
	});

	afterEach(async () => {
		dropDb(namespace);
	});

	const sandbox = {};
	setupMocks(sandbox, { namespace });

	it('should call when POSTing System', async () => {
		await sandbox
			.request(app)
			.post(`/v2/node/System/${namespace}-system`)
			.namespacedAuth()
			.send({
				name: 'created',
			});
		expect(salesforceSync.setSalesforceIdForSystem).toHaveBeenCalledTimes(
			1,
		);
		expect(
			salesforceSync.setSalesforceIdForSystem.mock.calls[0][0].code,
		).toBe('salesforce-sync-system');
	});

	it.skip('should call when PATCHing System', async () => {
		await sandbox
			.request(app)
			.patch(`/v2/node/System/${namespace}-system`)
			.namespacedAuth()
			.send({
				name: 'updated',
			});
		expect(salesforceSync.setSalesforceIdForSystem).toHaveBeenCalledTimes(
			1,
		);
		expect(
			salesforceSync.setSalesforceIdForSystem.mock.calls[0][0].code,
		).toBe('salesforce-sync-system');
	});

	it('should not call when POSTing non System', async () => {
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${namespace}-system`)
			.namespacedAuth()
			.send({
				name: 'created',
			});
		expect(salesforceSync.setSalesforceIdForSystem).not.toHaveBeenCalled();
	});

	it('should not call when PATCHing non System', async () => {
		await sandbox
			.request(app)
			.patch(`/v2/node/Team/${namespace}-system`)
			.namespacedAuth()
			.send({
				name: 'updated',
			});
		expect(salesforceSync.setSalesforceIdForSystem).not.toHaveBeenCalled();
	});
});
