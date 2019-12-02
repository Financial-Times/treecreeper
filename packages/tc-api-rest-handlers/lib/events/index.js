const groupBy = require('lodash.groupby');

const EventEmitter = require('events');
const {
	makeAddedRelationshipEvents,
	makeRemovedRelationshipEvents,
} = require('./related-events');

const acceptableActions = ['CREATE', 'UPDATE', 'DELETE'];
const emitter = new EventEmitter();

const unique = arr => [...new Set(arr)];

const combineSimilarEvents = events => {
	const groupedEvents = groupBy(
		events,
		({ action, code, type }) => `${action}:${code}:${type}`,
	);
	return Object.values(groupedEvents).map(groupedEvent => {
		const updatedPropertiesList = groupedEvent.map(
			event => event.updatedProperties,
		);
		const updatedProperties = unique([].concat(...updatedPropertiesList))
			.filter(name => name && name.charAt(0) !== '_')
			.sort();
		// Merge to first event object
		return Object.assign(groupedEvent[0], {
			...(groupedEvent[0].action === 'DELETE'
				? {}
				: { updatedProperties }),
		});
	});
};

const isCreatedBy = requestId => node =>
	node.properties._createdByRequest === requestId;

const makeEvents = ({
	code,
	type,
	addedRelationships,
	removedRelationships,
	updatedProperties,
	neo4jResult,
	requestId,
}) => {
	if (!neo4jResult.records.length) {
		return [
			{
				action: 'DELETE',
				type,
				code,
			},
		];
	}

	const action = isCreatedBy(requestId)(neo4jResult.records[0].get('node'))
		? 'CREATE'
		: 'UPDATE';

	if (action === 'UPDATE') {
		updatedProperties = updatedProperties.filter(prop => prop !== 'code');
	}

	const events = [];

	events.push({
		action,
		code,
		type,
		updatedProperties,
	});

	const addedRelationshipEvents = makeAddedRelationshipEvents(
		type,
		code,
		neo4jResult.records,
		addedRelationships,
		requestId,
	);
	events.push(...addedRelationshipEvents);

	const removedRelationshipEvents = makeRemovedRelationshipEvents(
		type,
		removedRelationships,
	);
	events.push(...removedRelationshipEvents);
	return combineSimilarEvents(events);
};

const broadcast = changeSummary => {
	makeEvents(changeSummary).forEach(event =>
		module.exports.emitter.emit(event.action, {
			time: Math.floor(Date.now() / 1000),
			...event,
		}),
	);
};

module.exports = {
	availableEvents: acceptableActions,
	emitter,
	broadcast,
};
