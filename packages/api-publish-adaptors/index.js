const { KinesisAdaptor } = require('./lib/kinesis-adaptor');

const { TREECREEPER_KINESIS_STREAM_NAME = 'kinesis-stream' } = process.env;

const composeAdaptor = (composeOptions = {}) => {
	const {
		adaptor,
		streamName = TREECREEPER_KINESIS_STREAM_NAME,
		logger,
	} = composeOptions;

	if (adaptor) {
		return composeOptions;
	}

	return {
		...composeOptions,
		publishAdaptor: new KinesisAdaptor({ streamName, logger }),
	};
};

module.exports = {
	KinesisAdaptor,
	composeAdaptor,
};
