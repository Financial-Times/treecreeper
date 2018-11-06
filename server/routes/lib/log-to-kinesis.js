const { logger } = require('../../lib/request-context');
const EventLogWriter = require('../../lib/event-log-writer');
const Kinesis = require('../../lib/kinesis-client');
const { getType } = require('@financial-times/biz-ops-schema');
const uniqBy = require('lodash.uniqby');
const kinesisClient = new Kinesis(
	process.env.CRUD_EVENT_LOG_STREAM_NAME || 'test-stream-name'
);
const eventLogWriter = new EventLogWriter(kinesisClient);
const { getContext } = require('../../lib/request-context');

const sendEvent = event => {
	eventLogWriter.sendEvent(event).catch(error => {
		logger.error(
			'Failed to send event to event log',
			Object.assign({ event, error: error })
		);
	});
};

const logNodeDeletion = node => {
	const { requestId, clientId } = getContext();
	sendEvent({
		action: 'DELETE',
		code: node.properties.code,
		type: node.labels[0],
		requestId,
		clientId
	});
};

const logNodeChanges = ({ newRecords, nodeType, removedRelationships }) => {
	const { requestId, clientId } = getContext();
	const node = newRecords[0].get('node');

	const events = [];

	events.push({
		action:
			node.properties._createdByRequest === requestId ? 'CREATE' : 'UPDATE',
		code: node.properties.code,
		type: node.labels[0],
		requestId,
		clientId
	});

	if (nodeType) {
		const { properties } = getType(nodeType);

		Object.entries(removedRelationships).forEach(([propName, codes]) => {
			codes.forEach(code =>
				events.push({
					action: 'UPDATE',
					code: code,
					type: properties[propName].type,
					requestId,
					clientId
				})
			);
		});
	}

	if (
		newRecords[0] &&
		newRecords[0].has('related') &&
		newRecords[0].get('related')
	) {
		newRecords.forEach(record => {
			const target = record.get('related');
			const rel = record.get('relationship');

			// If created the related node, it's an CREATE on it
			if (target.properties._createdByRequest === requestId) {
				events.push({
					action: 'CREATE',
					code: target.properties.code,
					type: target.labels[0],
					requestId,
					clientId
				});
				// Otherwise, we've just linked to it i.e. an UPDATE
			} else if (rel.properties._createdByRequest === requestId) {
				events.push({
					action: 'UPDATE',
					code: target.properties.code,
					type: target.labels[0],
					requestId,
					clientId
				});
			}
		});
	}

	uniqBy(
		events,
		({ action, code, type }) => `${action}:${code}:${type}`
	).forEach(sendEvent);
};

module.exports = {
	logNodeDeletion,
	logNodeChanges
};
