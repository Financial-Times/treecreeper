const { logger } = require('../../api-express/lib/request-context');

const requiredPluckFieldNames = ['action', 'code', 'type', 'updatedProperties'];
const requiredInterfaceMethods = ['publish', 'getName'];

const isImplemented = (adaptor, method) =>
	method in adaptor && typeof adaptor[method] === 'function';

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
		publish: async payload => publishEvent(adaptor, payload),
	};
};

module.exports = {
	createPublisher,
};
