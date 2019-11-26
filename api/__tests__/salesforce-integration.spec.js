const salesforceSync = require('../server/lib/salesforce-sync');
let createApp = require('../server/app.js');

const namespace = 'salesforce-sync';
const { dropDb } = require('../helpers/test-data');
const { setupMocks } = require('../helpers');

describe('salesforce sync integration', () => {
	beforeAll(async () => app = await createApp());
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
