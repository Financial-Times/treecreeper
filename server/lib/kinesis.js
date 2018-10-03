const AWS = require('aws-sdk');
const { logger } = require('../lib/request-context');

const {
	KINESIS_AWS_REGION: region = 'eu-west-1',
	KINESIS_AWS_ACCESS_KEY_ID: accessKeyId,
	KINESIS_AWS_SECRET_ACCESS_KEY: secretAccessKey,
	AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY
} = process.env;

function Kinesis(streamName) {
	const isProduction = process.env.NODE_ENV === 'production';

	const dyno = process.env.DYNO;

	const kinesisStreamOptions = {
		region,
		apiVersion: '2013-12-02',
		logger: {
			log(message) {
				logger.debug('Kinesis API call', message);
			}
		}
	};

	// infra-prod || infra-dev accounts
	const kinesisInfra = new AWS.Kinesis(
		Object.assign({}, kinesisStreamOptions, {
			accessKeyId,
			secretAccessKey,
			signatureCache: false
		})
	);

	// operations-reliability-prod || operations-reliability-test accounts
	const kinesisRelEng = new AWS.Kinesis(
		Object.assign({}, kinesisStreamOptions, {
			accessKeyId: AWS_ACCESS_KEY_ID,
			secretAccessKey: AWS_SECRET_ACCESS_KEY,
			signatureCache: false
		})
	);

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

			const putRecordInfra = Promise.resolve(
				kinesisInfra.putRecord(options)
			).catch(error => {
				logger.error('Kinesis put record failed', {
					event: 'KINESIS_PUT_RECORD_FAILURE',
					error,
					data,
					env: 'Infra'
				});
			});

			const putRecordRelEng = Promise.resolve(
				kinesisRelEng.putRecord(options)
			).catch(error => {
				logger.error('Kinesis put record failed', {
					event: 'KINESIS_PUT_RECORD_FAILURE',
					error,
					data,
					env: 'RelEng'
				});
			});

			return Promise.all([putRecordInfra, putRecordRelEng]);
		})
	};
}

module.exports = Kinesis;
