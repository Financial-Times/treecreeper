'use strict';

const logger = require('@financial-times/n-logger').default;
const kinesisFactory = require('./kinesis');

const kinesis = kinesisFactory(process.env.EVENT_LOG_STREAM_NAME || 'biz-ops-crud');

// Legacy attributes used by original cmdbv3 stream.
// Preserved for backwards compatibility
const addLegacyAttributes = ({ code, type }, record) =>
	Object.assign(record, {
    key: `${type}/${code}`,
    model: 'DataItem',
    name: 'dataItemID',
    value: code,
});

const sendEvent = data => {
    const missingFields = ['event', 'action', 'code', 'type'].filter(
		field => typeof data[field] === 'undefined'
	);
    if (missingFields.length > 0) {
        logger.warn('Missing required fields for event log record', { fields: missingFields, data });
    }
    const { event, action, code, type, relationshipType } = data;
    return kinesis.putRecord(
		addLegacyAttributes(data, {
    event,
    action,
    code: code.toLowerCase(),
    type: type.toLowerCase(),
    relationshipType,
    link: `${encodeURIComponent(type)}/${encodeURIComponent(code)}`,
    time: Math.floor(Date.now() / 1000),
})
	);
};

module.exports = {
    sendEvent,
};
