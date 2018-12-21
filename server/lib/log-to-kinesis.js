const { logger } = require('./request-context');
const EventLogWriter = require('./event-log-writer');
const Kinesis = require('./kinesis-client');
const { getType } = require('@financial-times/biz-ops-schema');
const uniqBy = require('lodash.uniqby');
const kinesisClient = new Kinesis(
	process.env.CRUD_EVENT_LOG_STREAM_NAME || 'test-stream-name'
);
const eventLogWriter = new EventLogWriter(kinesisClient);
const { getContext } = require('./request-context');

const sendEvent = event => {
	eventLogWriter.sendEvent(event).catch(error => {
		logger.error(
			'Failed to send event to event log',
			Object.assign({ event, error: error })
		);
	});
};

const sendUniqueEvents = events =>
	uniqBy(
		events,
		({ action, code, type }) => `${action}:${code}:${type}`
	).forEach(sendEvent);

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

	if (nodeType && removedRelationships) {
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

	sendUniqueEvents(events);
};

const logMergeChanges = (
	requestId,
	clientId,
	sourceNode,
	destinationNode,
	sourceRels,
	destinationRels
) => {
	sourceNode = sourceNode.records[0].get('node');
	destinationNode = destinationNode.records[0].get('node');

	const events = [
		{
			action: 'DELETE',
			code: sourceNode.properties.code,
			type: sourceNode.labels[0],
			requestId,
			clientId
		},
		{
			action: 'UPDATE',
			code: destinationNode.properties.code,
			type: destinationNode.labels[0],
			requestId,
			clientId
		}
	].concat(
		sourceRels.records
			.map(record => {
				const sourceTarget = record.get('related');
				const sourceRel = record.get('relationship');

				// reflexive relationships will all be discarded without a new creation event
				if (sourceTarget.identity.equals(sourceNode.identity)) {
					return;
				}

				const existingRecord = destinationRels.records.find(record => {
					const destinationTarget = record.get('related');
					const destinationRel = record.get('relationship');
					if (
						destinationTarget.identity.equals(sourceTarget.identity) &&
						destinationRel.type === sourceRel.type &&
						(destinationRel.start.equals(sourceRel.start) ||
							destinationRel.end.equals(sourceRel.end))
					) {
						return true;
					}
				});

				if (!existingRecord) {
					return {
						action: 'UPDATE',
						code: sourceTarget.properties.code,
						type: sourceTarget.labels[0],
						requestId,
						clientId
					};
				}
			})
			.filter(node => !!node)
	);

	sendUniqueEvents(events);
};

module.exports = {
	logNodeDeletion,
	logNodeChanges,
	logMergeChanges
};
