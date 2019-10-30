const { Kinesis } = require('aws-sdk');

const isDevelopment = () => process.env.NODE_ENV !== 'production';

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

const createStubKinesisClient = logger => ({
	putRecord: () => ({
		promise: async () => {
			logger.info(`Skipped kinesis as not in production`);
		},
	}),
});

const KinesisAdaptor = (streamName, { logger = console } = {}) => {
	const client = isDevelopment()
		? createStubKinesisClient(logger)
		: createKinesisClient(logger);

	return {
		getName: () => 'Kinesis',
		publish: async payload => {
			try {
				const { DYNO } = process.env;
				const options = {
					Data: Buffer.from(JSON.stringify(payload), 'utf8'),
					PartitionKey: `${DYNO}:${Date.now()}`,
					StreamName: streamName,
				};
				await client.putRecord(options).promise();
			} catch (error) {
				logger.error(
					{
						event: 'KINESIS_PUT_RECORD_FAILURE',
						error,
						payload,
					},
					'Kinesis put record failed',
				);
			}
		},
	};
};

module.exports = {
	KinesisAdaptor,
};
