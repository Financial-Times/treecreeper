const groupBy = require('lodash.groupby');
const { logger } = require('@financial-times/tc-api-express-logger');
const EventEmitter = require('events');
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

	const {
		added: addedRelationships = {},
		removed: removedRelationships = {},
	} = relationships;

	const updatedProperties = [
		...new Set(
			Object.keys(properties).concat(
				Object.keys(addedRelationships),
				Object.keys(removedRelationships),
			),
		),
	]
		.filter(key => !(action === 'UPDATE' && key === 'code'))
		.sort();

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
		]
			.filter(name => name.charAt(0) !== '_')
			.sort();
		// Merge to first event object
		return Object.assign(groupedEvent[0], {
			updatedProperties,
		});
	});
};
const requiredPluckFieldNames = ['action', 'code', 'type', 'updatedProperties'];

const publishEvent = payload => {
	const missingFields = requiredPluckFieldNames.filter(
		field => !(field in payload),
	);
	if (missingFields.length > 0) {
		logger.warn(
			{
				event: 'INVALID_PUBLISH_EVENT',
				missingFields,
				payload,
			},
			'Missing required fields for event log record',
		);
	}

	return requiredPluckFieldNames.reduce(
		(plucked, fieldName) =>
			Object.assign(plucked, { [fieldName]: payload[fieldName] }),
		{
			time: Math.floor(Date.now() / 1000),
		},
	);
};

const emitter = new EventEmitter();
const acceptableActions = ['CREATE', 'UPDATE', 'DELETE'];
const broadcast = (action, entity, { relationships = {} } = {}) => {
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

	const events = uniquifyEvents(makeEvents(action, entity, relationships));
	events.forEach(event => emitter.emit(event.action, publishEvent(event)));
};

module.exports = {
	availableEvents: acceptableActions,
	emitter,
	broadcast,
};
