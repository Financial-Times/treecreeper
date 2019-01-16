const { getType } = require('@financial-times/biz-ops-schema');
const uniqBy = require('lodash.uniqby');
const { logger } = require('./request-context');
const EventLogWriter = require('./event-log-writer');
const Kinesis = require('./kinesis-client');

const kinesisClient = new Kinesis(
	process.env.CRUD_EVENT_LOG_STREAM_NAME || 'test-stream-name',
);
const eventLogWriter = new EventLogWriter(kinesisClient);
const { getContext } = require('./request-context');

const sendEvent = event => {
	eventLogWriter.sendEvent(event).catch(error => {
		logger.error(
			'Failed to send event to event log',
			Object.assign({ event, error }),
		);
	});
};

const sendUniqueEvents = events =>
	uniqBy(
		events,
		({ action, code, type }) => `${action}:${code}:${type}`,
	).forEach(sendEvent);

const logNodeDeletion = node => {
	const { requestId, clientId, clientUserId } = getContext();
	sendEvent({
		action: 'DELETE',
		code: node.properties.code,
		type: node.labels[0],
		requestId,
		clientId,
		clientUserId,
	});
};

const logNodeChanges = ({ newRecords, nodeType, removedRelationships }) => {
	const { requestId, clientId, clientUserId } = getContext();
	const node = newRecords[0].get('node');

	const events = [];

	events.push({
		action:
			node.properties._createdByRequest === requestId
				? 'CREATE'
				: 'UPDATE',
		code: node.properties.code,
		type: node.labels[0],
		requestId,
		clientId,
		clientUserId,
	});

	if (nodeType && removedRelationships) {
		const { properties } = getType(nodeType);

		Object.entries(removedRelationships).forEach(([propName, codes]) => {
			codes.forEach(code =>
				events.push({
					action: 'UPDATE',
					code,
					type: properties[propName].type,
					requestId,
					clientId,
					clientUserId,
				}),
			);
		});
	}

	if (
		newRecords[0] &&
		newRecords[0].has('relatedCode') &&
		newRecords[0].get('relatedCode')
	) {
		newRecords.forEach(record => {
			const relatedCode = record.get('relatedCode');
			const relatedRequestId = record.get('relatedRequestId');
			const relatedLabels = record.get('relatedLabels');
			const rel = record.get('relationship');

			// If created the related node, it's an CREATE on it
			if (relatedRequestId === requestId) {
				events.push({
					action: 'CREATE',
					code: relatedCode,
					type: relatedLabels[0],
					requestId,
					clientId,
					clientUserId,
				});
				// Otherwise, we've just linked to it i.e. an UPDATE
			} else if (rel.properties._createdByRequest === requestId) {
				events.push({
					action: 'UPDATE',
					code: relatedCode,
					type: relatedLabels[0],
					requestId,
					clientId,
					clientUserId,
				});
			}
		});
	}

	sendUniqueEvents(events);
};

const logMergeChanges = (
	requestId,
	clientId,
	clientUserId,
	sourceNode,
	destinationNode,
	sourceRels,
	destinationRels,
) => {
	sourceNode = sourceNode.records[0].get('node');
	destinationNode = destinationNode.records[0].get('node');

	const events = [
		{
			action: 'DELETE',
			code: sourceNode.properties.code,
			type: sourceNode.labels[0],
			requestId,
			clientId,
			clientUserId,
		},
		{
			action: 'UPDATE',
			code: destinationNode.properties.code,
			type: destinationNode.labels[0],
			requestId,
			clientId,
			clientUserId,
		},
	].concat(
		sourceRels.records
			.map(sourceRelsRecord => {
				const sourceTarget = sourceRelsRecord.get('related');
				const sourceRel = sourceRelsRecord.get('relationship');

				// reflexive relationships will all be discarded without a new creation event
				if (sourceTarget.identity.equals(sourceNode.identity)) {
					return;
				}

				const existingRecord = destinationRels.records.find(
					destinationRelsRecord => {
						const destinationTarget = destinationRelsRecord.get(
							'related',
						);
						const destinationRel = destinationRelsRecord.get(
							'relationship',
						);
						if (
							destinationTarget.identity.equals(
								sourceTarget.identity,
							) &&
							destinationRel.type === sourceRel.type &&
							(destinationRel.start.equals(sourceRel.start) ||
								destinationRel.end.equals(sourceRel.end))
						) {
							return true;
						}
					},
				);

				if (!existingRecord) {
					return {
						action: 'UPDATE',
						code: sourceTarget.properties.code,
						type: sourceTarget.labels[0],
						requestId,
						clientId,
						clientUserId,
					};
				}
			})
			.filter(node => !!node),
	);

	sendUniqueEvents(events);
};

module.exports = {
	logNodeDeletion,
	logNodeChanges,
	logMergeChanges,
};
