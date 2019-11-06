const groupBy = require('lodash.groupby');
const { logger } = require('@treecreeper/api-express-logger');

const requiredPluckFieldNames = ['action', 'code', 'type', 'updatedProperties'];
const requiredInterfaceMethods = ['publish', 'getName'];

const isImplemented = (adaptor, method) =>
	method in adaptor && typeof adaptor[method] === 'function';

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
	// adaptor can extend fields by implementing pluckFields() method
	const pluckFields = isImplemented(adaptor, 'pluckFields')
		? requiredPluckFieldNames.concat(adaptor.pluckFields())
		: requiredPluckFieldNames;

	const missingFields = pluckFields.filter(field => !(field in payload));
	if (missingFields.length > 0) {
		logger.warn(
			{
				event: 'INVALID_PUBLISH_EVENT',
				missingFields,
				adaptorName: adaptor.getName(),
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
	const notImplemented = requiredInterfaceMethods.filter(
		method => !isImplemented(adaptor, method),
	);
	if (notImplemented.length > 0) {
		throw new TypeError(
			`Interface satisfaction error: adaptor must implement ${notImplemented.join(
				',',
			)} method.`,
		);
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
