const { setupMocks } = require('../helpers');
const app = require('../../server/app.js');
const validation = require('../../server/lib/schema-validation');

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
				.post(`/v2/node/Team/${namespace}-team`)
				.namespacedAuth()
				.send({
					foo: 'created'
				});
			expect(validation.validateProperty).toHaveBeenCalledWith(
				'Team',
				'foo',
				'created'
			);
		});
		it('should call when PATCHing node', async () => {
			await sandbox
				.request(app)
				.patch(`/v2/node/Team/${namespace}-team`)
				.namespacedAuth()
				.send({
					foo: 'updated'
				});
			expect(validation.validateProperty).toHaveBeenCalledWith(
				'Team',
				'foo',
				'updated'
			);
		});
	});
});
