const logger = require('@financial-times/n-logger').default;
const EventLogWriter = require('../lib/event-log-writer');
const Kinesis = require('../lib/kinesis');
const { isSameNeo4jInteger } = require('./utils');

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

const createRelationshipInfoFromNeo4jData = ({ rel, destination, origin }) => {
	const isIncoming = !isSameNeo4jInteger(rel.start, origin.identity);
	return {
		relType: rel.type,
		direction: isIncoming ? 'incoming' : 'outgoing',
		nodeCode: destination.properties.code,
		nodeType: destination.labels[0]
	};
};

const sendNodeRelationshipEvent = ({
	verb,
	rel,
	destination,
	origin,
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
	let action;
	if (node.properties.deletedByRequest === requestId) {
		event = 'DELETED_NODE';
		action = EventLogWriter.actions.DELETE;
	} else if (node.properties._createdByRequest === requestId) {
		event = 'CREATED_NODE';
		action = EventLogWriter.actions.CREATE;
	} else {
		event = 'UPDATED_NODE';
		action = EventLogWriter.actions.UPDATE;
	}

	sendEvent({
		event,
		action,
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
					action: EventLogWriter.actions.CREATE,
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
		action: EventLogWriter.actions.UPDATE,
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
		action: EventLogWriter.actions.UPDATE,
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
	console.log('LOG RELATIONSHIP CHANGES');
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

module.exports = { logNodeChanges, logRelationshipChanges };
