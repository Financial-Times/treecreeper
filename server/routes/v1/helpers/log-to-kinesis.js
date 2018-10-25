const { logger } = require('../../../lib/request-context');
const EventLogWriter = require('../../../lib/event-log-writer');
const Kinesis = require('../../../lib/kinesis-client');

const kinesisClient = new Kinesis(
	process.env.CRUD_EVENT_LOG_STREAM_NAME || 'test-stream-name'
);
const eventLogWriter = new EventLogWriter(kinesisClient);

const sendEvent = event => {
	event.action = actionFromEvent(event.event);
	eventLogWriter.sendEvent(event).catch(error => {
		logger.error(
			'Failed to send event to event log',
			Object.assign({ event, error: error })
		);
	});
};

const calculateDirection = (rel, origin) =>
	!rel.start.equals(origin.identity) ? 'incoming' : 'outgoing';

const actionFromEvent = event => {
	if (/D_NODE$/.test(event)) {
		return event.replace(/D_NODE$/, '');
	}
	return 'UPDATE';
};

const createRelationshipInfoFromNeo4jData = ({
	rel,
	destination,
	origin,
	direction
}) => {
	return {
		relType: rel.type,
		direction: direction || calculateDirection(rel, origin),
		nodeCode: destination.properties.code,
		nodeType: destination.labels[0]
	};
};

const sendNodeRelationshipEvent = ({
	verb,
	rel,
	destination,
	origin,
	direction,
	requestId,
	clientId
}) => {
	return sendEvent(
		Object.assign(
			{
				code: origin.properties.code,
				type: origin.labels[0]
			},
			{
				event: `${verb}_RELATIONSHIP`,
				action: EventLogWriter.actions.UPDATE,
				relationship: createRelationshipInfoFromNeo4jData({
					rel,
					destination,
					direction,
					origin
				}),
				requestId,
				clientId
			}
		)
	);
};

const logNodeChanges = (clientId, requestId, result, deletedRelationships) => {
	const node = result.records[0].get('node');
	let event;
	if (node.properties.deletedByRequest === requestId) {
		event = 'DELETED_NODE';
	} else if (node.properties._createdByRequest === requestId) {
		event = 'CREATED_NODE';
	} else {
		event = 'UPDATED_NODE';
	}

	sendEvent({
		event,
		code: node.properties.code,
		type: node.labels[0],
		requestId,
		clientId
	});

	if (
		result.records[0] &&
		result.records[0].has('related') &&
		result.records[0].get('related')
	) {
		result.records.forEach(record => {
			const target = record.get('related');
			const rel = record.get('relationship');

			if (target.properties._createdByRequest === requestId) {
				sendEvent({
					event: 'CREATED_NODE',
					code: target.properties.code,
					type: target.labels[0],
					requestId,
					clientId
				});
			}

			if (rel.properties._createdByRequest === requestId) {
				sendNodeRelationshipEvent({
					verb: 'CREATED',
					rel,
					destination: target,
					origin: node,
					requestId,
					clientId
				});

				sendNodeRelationshipEvent({
					verb: 'CREATED',
					rel,
					destination: node,
					origin: target,
					requestId,
					clientId
				});
			}
		});
	}

	if (deletedRelationships && deletedRelationships.records.length) {
		deletedRelationships.records.forEach(record => {
			const target = record.get('related');
			const rel = record.get('relationship');

			sendNodeRelationshipEvent({
				verb: 'DELETED',
				rel,
				destination: target,
				origin: node,
				requestId,
				clientId
			});

			sendNodeRelationshipEvent({
				verb: 'DELETED',
				rel,
				destination: node,
				origin: target,
				requestId,
				clientId
			});
		});
	}
};

const sendRelationshipEvents = (
	verb,
	requestId,
	clientId,
	{ nodeType, code, relatedType, relatedCode, relationshipType }
) => {
	sendEvent({
		event: `${verb}_RELATIONSHIP`,
		relationship: {
			relType: relationshipType,
			direction: 'outgoing',
			nodeCode: relatedCode,
			nodeType: relatedType
		},
		code,
		type: nodeType,
		requestId,
		clientId
	});
	sendEvent({
		event: `${verb}_RELATIONSHIP`,
		relationship: {
			relType: relationshipType,
			direction: 'incoming',
			nodeCode: code,
			nodeType: nodeType
		},
		code: relatedCode,
		type: relatedType,
		requestId,
		clientId
	});
};

const logRelationshipChanges = (requestId, clientId, result, params) => {
	if (!result.records[0]) {
		sendRelationshipEvents('DELETED', requestId, clientId, params);
	} else {
		const relationshipRecord = result.records[0].get('relationship');
		if (relationshipRecord.properties._createdByRequest === requestId) {
			sendRelationshipEvents('CREATED', requestId, clientId, params);
		} else {
			sendRelationshipEvents('UPDATED', requestId, clientId, params);
		}
	}
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

	sendEvent({
		event: 'DELETED_NODE',
		code: sourceNode.properties.code,
		type: sourceNode.labels[0],
		requestId,
		clientId
	});

	sendEvent({
		event: 'UPDATED_NODE',
		code: destinationNode.properties.code,
		type: destinationNode.labels[0],
		requestId,
		clientId
	});

	sourceRels.records.forEach(record => {
		const sourceTarget = record.get('related');
		const sourceRel = record.get('relationship');

		sendNodeRelationshipEvent({
			verb: 'DELETED',
			rel: sourceRel,
			destination: sourceNode,
			origin: sourceTarget,
			requestId,
			clientId
		});

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
			sendNodeRelationshipEvent({
				verb: 'CREATED',
				rel: sourceRel,
				destination: destinationNode,
				direction: calculateDirection(sourceRel, sourceTarget),
				origin: sourceTarget,
				requestId,
				clientId
			});

			sendNodeRelationshipEvent({
				verb: 'CREATED',
				rel: sourceRel,
				destination: sourceTarget,
				direction: calculateDirection(sourceRel, sourceNode),
				origin: destinationNode,
				requestId,
				clientId
			});
		}
	});
};

module.exports = {
	logNodeChanges,
	logRelationshipChanges,
	logMergeChanges
};
