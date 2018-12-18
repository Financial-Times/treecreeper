const AWS = require('aws-sdk');
const { logger } = require('./request-context');

const {
	KINESIS_AWS_REGION: region = 'eu-west-1',
	AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY
} = process.env;

function Kinesis(streamName) {
	const isProduction = process.env.NODE_ENV === 'production';

	const dyno = process.env.DYNO;

	const kinesisClient = new AWS.Kinesis({
		region,
		apiVersion: '2013-12-02',
		logger: {
			log(message) {
				logger.debug('Kinesis API call', message);
			}
		},
		accessKeyId: AWS_ACCESS_KEY_ID,
		secretAccessKey: AWS_SECRET_ACCESS_KEY,
		signatureCache: false
	});

	const stubInDevelopment = (action, fn) => (...args) => {
		if (!isProduction) {
			logger.debug(`Skipped kinesis ${action} as not in production`, {
				event: args[0].event
			});
			return Promise.resolve();
		}
		return fn(...args);
	};

	return {
		putRecord: stubInDevelopment('put record', data => {
			const options = {
				Data: Buffer.from(JSON.stringify(data), 'utf-8'),
				PartitionKey: `${dyno}:${Date.now()}`,
				StreamName: streamName
			};
			return kinesisClient
				.putRecord(options)
				.promise()
				.catch(error => {
					logger.error('Kinesis put record failed', {
						event: 'KINESIS_PUT_RECORD_FAILURE',
						error,
						data,
						env: 'RelEng'
					});
				});
		})
	};
}

module.exports = Kinesis;
