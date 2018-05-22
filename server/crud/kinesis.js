const logger = require('@financial-times/n-logger').default;
const EventLogWriter = require('../lib/event-log-writer');
const Kinesis = require('../lib/kinesis');
const { isSameInteger } = require('./utils');

const kinesisClient = new Kinesis(
	process.env.CRUD_EVENT_LOG_STREAM_NAME || 'test-stream-name'
);
const eventLogWriter = new EventLogWriter(kinesisClient);

const sendEvent = event =>
	eventLogWriter.sendEvent(event).catch(error => {
		logger.error(
			'Failed to send event to event log',
			Object.assign({ event, error: error })
		);
	});

const logChanges = (requestId, result) => {
	const node = result.records[0].get('node');
	let event;
	let action;
	if (node.properties.deletedByRequest === requestId) {
		event = 'DELETED_NODE';
		action = EventLogWriter.actions.DELETE;
	} else if (node.properties.createdByRequest === requestId) {
		event = 'CREATED_NODE';
		action = EventLogWriter.actions.CREATE;
	} else {
		event = 'UPDATED_NODE';
		action = EventLogWriter.actions.UPDATE;
	}

	sendEvent({
		event,
		action,
		code: node.properties.id,
		type: node.labels[0],
		requestId
	});

	if (
		result.records[0] &&
		result.records[0].has('related') &&
		result.records[0].get('related')
	) {
		result.records.forEach(record => {
			const target = record.get('related');
			const rel = record.get('relationship');

			if (target.properties.createdByRequest === requestId) {
				sendEvent({
					event: 'CREATED_NODE',
					action: EventLogWriter.actions.CREATE,
					code: target.properties.id,
					type: target.labels[0],
					requestId
				});
			}

			if (rel.properties.createdByRequest === requestId) {
				sendEvent({
					event: 'CREATED_RELATIONSHIP',
					action: EventLogWriter.actions.UPDATE,
					relationship: {
						relType: rel.type,
						direction: isSameInteger(rel.start, node.identity)
							? 'outgoing'
							: 'incoming',
						nodeCode: target.properties.id,
						nodeType: target.labels[0]
					},
					code: node.properties.id,
					type: node.labels[0],
					requestId
				});

				sendEvent({
					event: 'CREATED_RELATIONSHIP',
					action: EventLogWriter.actions.UPDATE,
					relationship: {
						relType: rel.type,
						direction: isSameInteger(rel.start, node.identity)
							? 'incoming'
							: 'outgoing',
						nodeCode: node.properties.id,
						nodeType: node.labels[0]
					},
					code: target.properties.id,
					type: target.labels[0],
					requestId
				});
			}
		});
	}
};

module.exports = { logChanges };
