const { logger } = require('./request-context');

const FIELD_NAMES = ['action', 'code', 'type', 'updatedProperties'];

const pluckFields = obj =>
	FIELD_NAMES.reduce(
		(result, name) => Object.assign(result, { [name]: obj[name] }),
		{},
	);

class EventLogWriter {
	constructor(kinesisClient) {
		this.kinesisClient = kinesisClient;
	}

	sendEvent(data) {
		const missingFields = FIELD_NAMES.filter(
			field => typeof data[field] === 'undefined',
		);

		if (missingFields.length > 0) {
			logger.warn(
				{
					event: 'INVALID_KINESIS_EVENT',
					missingFields,
					data,
				},
				'Missing required fields for event log record',
			);
		}

		const payload = Object.assign(pluckFields(data), {
			time: Math.floor(Date.now() / 1000),
		});

		return this.kinesisClient.putRecord(payload);
	}
}

module.exports = EventLogWriter;
