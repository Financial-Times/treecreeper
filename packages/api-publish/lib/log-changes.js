const groupBy = require('lodash.groupby');
const { logger } = require('../../api-express/lib/request-context');
const { KinesisAdaptor } = require('../../api-publish-adaptors');
const { createPublisher } = require('./publisher');
const {
	makeAddedRelationshipEvents,
	makeRemovedRelationshipEvents,
} = require('./relationship-events');

const { TREECREPER_EVENT_LOG_STREAM_NAME = 'test-stream-name' } = process.env;

const makeEvents = (action, relatedAction, neo4jEntity, relationships) => {
	const record = neo4jEntity.records[0];
	const node = record.get('node');
	const { properties, labels } = node;
	const nodeType = labels[0];
	const { code } = properties;
	const events = [];
	const updatedProperties = Object.keys(properties);

	const {
		added: addedRelationships = {},
		removed: removedRelationships = {},
	} = relationships;
	events.push({
		action,
		code,
		type: nodeType,
		updatedProperties,
	});

	const addedRelationshipEvents = makeAddedRelationshipEvents(
		nodeType,
		code,
		neo4jEntity.records,
		addedRelationships,
	);
	events.push(...addedRelationshipEvents);

	const removedRelationshipEvents = makeRemovedRelationshipEvents(
		nodeType,
		properties,
		removedRelationships,
	);
	events.push(...removedRelationshipEvents);

	return events;
};

const uniquifyEvents = events => {
	const groupedEvents = groupBy(
		events,
		({ action, code, type }) => `${action}:${code}:${type}`,
	);
	return Object.values(groupedEvents).map(groupedEvent => {
		const updatedPropertiesList = groupedEvent.map(
			event => event.updatedProperties,
		);
		const updatedProperties = [
			...new Set([].concat(...updatedPropertiesList)),
		].sort();
		// Merge to first event object
		return Object.assign(groupedEvent[0], {
			updatedProperties,
		});
	});
};

const acceptableActions = ['CREATE', 'UPDATE', 'DELETE'];

const logChanges = (
	action,
	entity,
	{
		relatedAction = 'UPDATE',
		relationships = {},
		adaptor = KinesisAdaptor(TREECREPER_EVENT_LOG_STREAM_NAME),
	} = {},
) => {
	if (!acceptableActions.includes(action)) {
		const message = `Invalid action: ${action}. action must be either of ${acceptableActions.join(
			',',
		)}`;
		logger.error({
			event: 'INVALID_LOG_CHANGE_ACTION',
			message,
		});
		throw new Error(message);
	}

	const events = makeEvents(action, relatedAction, entity, relationships);
	const publisher = createPublisher(adaptor);
	uniquifyEvents(events).forEach(event => publisher.publish(event));
};

module.exports = {
	logChanges,
};
