const KinesisAdaptor = require('./lib/kinesis-adaptor');
const ConsoleAdaptor = require('./lib/console-adaptor');
const DiscardAdaptor = require('./lib/discard-adaptor');

const { TREECREEPER_KINESIS_STREAM_NAME = 'kinesis-stream' } = process.env;

const composeAdaptor = (composeOptions = {}) => {
	const {
		publishAdaptor,
		streamName = TREECREEPER_KINESIS_STREAM_NAME,
		logger,
	} = composeOptions;

	return {
		...composeOptions,
		publishAdaptor:
			publishAdaptor || new KinesisAdaptor({ streamName, logger }),
	};
};

module.exports = {
	KinesisAdaptor,
	ConsoleAdaptor,
	DiscardAdaptor,
	composeAdaptor,
};
