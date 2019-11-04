const { ConsoleAdaptor } = require('../../api-publish-adaptors');
const { createPublisher } = require('./publisher');
const {
	makeAddedRelationshipEvents,
	makeRemovedRelationshipEvents,
} = require('./related-events');

const makeEvents = (action, neo4jEntity, relationships) => {
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
		removedRelationships,
	);
	events.push(...removedRelationshipEvents);

	return events;
};

const acceptableActions = ['CREATE', 'UPDATE', 'DELETE'];

const logChanges = (
	action,
	entity,
	{ relationships = {}, adaptor = new ConsoleAdaptor() } = {},
) => {
	if (!acceptableActions.includes(action)) {
		const message = `Invalid action: ${action}. action must be either of ${acceptableActions.join(
			',',
		)}`;
		adaptor.error({
			event: 'INVALID_LOG_CHANGE_ACTION',
			message,
		});
		throw new Error(message);
	}

	const events = makeEvents(action, entity, relationships);
	const publisher = createPublisher(adaptor);
	publisher.publish(...events);
};

module.exports = {
	logChanges,
};
