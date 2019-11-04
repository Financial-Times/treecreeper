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

class KinesisAdaptor {
	constructor({ streamName, logger } = {}) {
		this.logger = logger;
		this.streamName = streamName;

		this.client = isDevelopment()
			? createStubKinesisClient(this.logger)
			: createKinesisClient(this.logger);
	}

	async publish(payload) {
		try {
			const streamName =
				this.kinesisStreamName ||
				process.env.TREECREEPER_KINESIS_STREAM_NAME;

			const options = {
				Data: Buffer.from(JSON.stringify(payload), 'utf8'),
				PartitionKey: 'SinglePartitionOnlySupported',
				StreamName: streamName,
			};
			await this.client.putRecord(options).promise();
		} catch (error) {
			this.logger.error(
				{
					event: 'KINESIS_PUT_RECORD_FAILURE',
					error,
					payload,
				},
				'Kinesis put record failed',
			);
		}
	}
}

module.exports = {
	KinesisAdaptor,
};
