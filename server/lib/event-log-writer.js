const { logger } = require('./request-context');

class EventLogWriter {
	constructor(kinesisClient) {
		this.kinesisClient = kinesisClient;
	}

	sendEvent(data) {
		const missingFields = ['action', 'code', 'type'].filter(
			field => typeof data[field] === 'undefined'
		);
		if (missingFields.length > 0) {
			logger.warn('Missing required fields for event log record', {
				fields: missingFields,
				data
			});
		}
		const { action, code, type } = data;

		return this.kinesisClient.putRecord({
			action,
			code: code,
			type: type,
			time: Math.floor(Date.now() / 1000)
		});
	}
}

module.exports = EventLogWriter;
