const groupBy = require('lodash.groupby');
const Adaptor = require('../../api-publish-adaptors/lib/adaptor');

const requiredPluckFieldNames = ['action', 'code', 'type', 'updatedProperties'];

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

const publishEvent = async (adaptor, payload) => {
	const pluckFields = requiredPluckFieldNames.concat(adaptor.pluckFields());
	const missingFields = pluckFields.filter(field => !(field in payload));
	if (missingFields.length > 0) {
		adaptor.warn(
			{
				event: 'INVALID_PUBLISH_EVENT',
				missingFields,
				payload,
			},
			'Missing required fields for event log record',
		);
	}

	const pluckedPayload = pluckFields.reduce(
		(plucked, fieldName) =>
			Object.assign(plucked, { [fieldName]: payload[fieldName] }),
		{
			time: Math.floor(Date.now() / 1000),
		},
	);

	await adaptor.publish(pluckedPayload);
};

const createPublisher = adaptor => {
	if (!(adaptor instanceof Adaptor)) {
		throw new TypeError('adaptor must be extended Adaptor class');
	}

	return {
		publish: async (...events) => {
			uniquifyEvents(events).forEach(payload =>
				publishEvent(adaptor, payload),
			);
		},
	};
};

module.exports = {
	createPublisher,
};
