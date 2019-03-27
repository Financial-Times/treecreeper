const primitiveTypes = require('./primitive-types-map');
const sendSchemaToS3 = require('./send-schema-to-s3');

const RawData = require('./raw-data');
const getDataAccessors = require('../data-accessors');
const getValidators = require('./validate');

module.exports = {
	init: (opts = {}) => {
		const rawData = new RawData(opts);

		// generally only use in tests
		if (opts.rawData) {
			rawData.setRawData(opts.rawData);
		}
		const dataAccessors = getDataAccessors(rawData);
		const validate = getValidators(dataAccessors);

		return Object.assign(
			{
				on: rawData.on.bind(rawData),
				configure: rawData.configure.bind(rawData),
				startPolling: rawData.startPolling.bind(rawData),
				stopPolling: rawData.stopPolling.bind(rawData),
				refresh: rawData.refresh.bind(rawData),
				normalizeTypeName: name => name,
				primitiveTypesMap: primitiveTypes,
				sendSchemaToS3: env =>
					sendSchemaToS3.bind(env, rawData.getAll()),
			},
			validate,
			dataAccessors,
		);
	},
};
