const { SchemaConsumer } = require('../../packages/schema-consumer');
const getDataAccessors = require('./data-accessors');
const getValidators = require('./validators');
const BizOpsError = require('./biz-ops-error');

module.exports = {
	init: (opts = {}) => {
		const rawData = new SchemaConsumer(opts);

		// generally only used in tests
		if (opts.rawData) {
			rawData.setRawData(opts.rawData);
		}
		const dataAccessors = getDataAccessors(rawData);
		const validators = getValidators(dataAccessors);

		return Object.assign(dataAccessors, {
			updater: rawData,
			validators,
			BizOpsError,
		});
	},
};
