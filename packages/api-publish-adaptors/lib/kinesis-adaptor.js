const { Kinesis } = require('aws-sdk');

const createKinesisClient = logger => {
	const {
		KINESIS_AWS_REGION = 'eu-west-1',
		AWS_ACCESS_KEY_ID,
		AWS_SECRET_ACCESS_KEY,
	} = process.env;

	return new Kinesis({
		region: KINESIS_AWS_REGION,
		apiVersion: '2013-12-02',
		logger: {
			log(message) {
				logger.info('Kinesis API call', message);
			},
		},
		accessKeyId: AWS_ACCESS_KEY_ID,
		secretAccessKey: AWS_SECRET_ACCESS_KEY,
		signatureCache: false,
	});
};

const KinesisAdaptor = (streamName, { logger = console } = {}) => {
	// eslint-disable-next-line no-unused-vars
	const client = createKinesisClient(logger);
	return {
		getName: () => 'Kinesis',
		publish: async () => {
			// client.putRecord({
			//   Data: Buffer.from(JSON.stringify(payload), 'utf8'),
			//   ...
			// });
		},
	};
};

module.exports = {
	KinesisAdaptor,
};
