const groupBy = require('lodash.groupby');
const schema = require('@financial-times/tc-schema-sdk');
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
		const updatedPropertiesList = groupedEvent.flatMap(
			event => event.updatedProperties,
		);
		const updatedProperties = unique(
			unique(updatedPropertiesList)
				.filter(name => name && name.charAt(0) !== '_')
				.flatMap(propName =>
					schema.findPropertyNames(groupedEvent[0].type, propName),
				),
		).sort();
		// Merge to first event object
		return Object.assign(groupedEvent[0], {
			...(groupedEvent[0].action === 'DELETE'
				? {}
				: { updatedProperties }),
		});
	});
};

const makeEvents = ({
	action,
	code,
	type,
	changedRelationships,
	removedRelationships,
	updatedProperties = [],
	neo4jResult,
	requestId,
}) => {
	if (action === 'DELETE') {
		return [
			{
				action: 'DELETE',
				type,
				code,
			},
		];
	}

	const events = [];

	if (updatedProperties.length) {
		if (action === 'UPDATE') {
			updatedProperties = updatedProperties.filter(
				prop => prop !== 'code',
			);
		}
		events.push({
			action,
			code,
			type,
			updatedProperties,
		});
	}
	if (changedRelationships) {
		const addedRelationshipEvents = makeAddedRelationshipEvents(
			type,
			code,
			neo4jResult.records,
			changedRelationships,
			requestId,
		);
		events.push(...addedRelationshipEvents);
	}
	const removedRelationshipEvents = makeRemovedRelationshipEvents(
		type,
		removedRelationships,
	);
	events.push(...removedRelationshipEvents);

	return events;
};

const broadcast = changeSummaries => {
	if (!Array.isArray(changeSummaries)) {
		changeSummaries = [changeSummaries];
	}
	const combinedEvents = combineSimilarEvents(
		changeSummaries.flatMap(makeEvents),
	);

	combinedEvents.forEach(event =>
		module.exports.emitter.emit(event.action, {
			timestamp: Math.floor(Date.now() / 1000),
			...event,
		}),
	);
};

module.exports = {
	availableEvents: acceptableActions,
	emitter,
	broadcast,
};
