const AWS = require('aws-sdk');
const { logger } = require('../lib/request-context');

const {
	KINESIS_AWS_REGION: region = 'eu-west-1',
	KINESIS_AWS_ACCESS_KEY_ID: accessKeyId,
	KINESIS_AWS_SECRET_ACCESS_KEY: secretAccessKey
} = process.env;

function Kinesis(streamName) {
	const isProduction = process.env.NODE_ENV === 'production';

	const dyno = process.env.DYNO;
	const kinesis = new AWS.Kinesis({
		accessKeyId,
		secretAccessKey,
		region,
		apiVersion: '2013-12-02',
		logger: {
			log(message) {
				logger.debug('Kinesis API call', message);
			}
		}
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
			return kinesis
				.putRecord({
					Data: Buffer.from(JSON.stringify(data), 'utf-8'),
					PartitionKey: `${dyno}:${Date.now()}`,
					StreamName: streamName
				})
				.promise()
				.catch(error => {
					logger.error('Kinesis put record failed', {
						event: 'KINESIS_PUT_RECORD_FAILURE',
						error,
						data
					});
					throw error;
				});
		})
	};
}

module.exports = Kinesis;
