const { logger } = require('./request-context');

const actions = {
	CREATE: 'CREATE',
	UPDATE: 'UPDATE',
	DELETE: 'DELETE'
};

// Legacy attributes used by original cmdbv3 stream.
// Preserved for backwards compatibility
const addLegacyAttributes = ({ code, type }, record) =>
	Object.assign(record, {
		key: `${type.toLowerCase()}/${code}`,
		model: 'DataItem',
		name: 'dataItemID',
		value: code
	});

class EventLogWriter {
	constructor(kinesisClient) {
		this.kinesisClient = kinesisClient;
	}

	sendEvent(data) {
		const missingFields = ['event', 'action', 'code', 'type'].filter(
			field => typeof data[field] === 'undefined'
		);
		if (missingFields.length > 0) {
			logger.warn('Missing required fields for event log record', {
				fields: missingFields,
				data
			});
		}
		const { event, action, code, type, relationship } = data;

		if (typeof actions[action] === 'undefined') {
			logger.warn('Unrecognised event name passed to event log', {
				event,
				data
			});
		}

		return this.kinesisClient.putRecord(
			addLegacyAttributes(data, {
				event: event,
				action,
				code: code,
				type: type,
				relationship,
				link: `/api/${encodeURIComponent(type)}/${encodeURIComponent(code)}`,
				time: Math.floor(Date.now() / 1000)
			})
		);
	}
}

module.exports = EventLogWriter;
module.exports.actions = actions;
