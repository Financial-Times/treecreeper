const { setupMocks } = require('../helpers');
const app = require('../../server/app.js');
const validation = require('../../server/routes/rest/lib/validation');

describe('validation', () => {
	describe('integration with api', () => {
		const sandbox = {};
		const namespace = 'v2-node-validation';

		setupMocks(sandbox, { namespace });

		beforeEach(() => {
			jest.spyOn(validation, 'validateProperty');
		});
		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should call when POSTing node', async () => {
			await sandbox
				.request(app)
				.post(`/v2/node/MainType/${namespace}-main`)
				.namespacedAuth()
				.send({
					foo: 'created',
				});
			expect(validation.validateProperty).toHaveBeenCalledWith(
				'MainType',
				'foo',
				'created',
			);
		});
		it('should call when PATCHing node', async () => {
			await sandbox
				.request(app)
				.patch(`/v2/node/MainType/${namespace}-main`)
				.namespacedAuth()
				.send({
					foo: 'updated',
				});
			expect(validation.validateProperty).toHaveBeenCalledWith(
				'MainType',
				'foo',
				'updated',
			);
		});
	});
});
