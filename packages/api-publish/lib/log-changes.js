const groupBy = require('lodash.groupby');
const { logger } = require('../../api-express/lib/request-context');
const { KinesisAdaptor } = require('../../api-publish-adaptors');
const { createPublisher } = require('./publisher');
const { findRelatedRecords } = require('./related-record');

const { TREECREPER_EVENT_LOG_STREAM_NAME = 'test-stream-name' } = process.env;

const makePayloads = (action, relatedAction, neo4jEntity) => {
	const node = neo4jEntity.records[0].get('node');
	const { properties, labels } = node;
	const nodeType = labels[0];
	const { code } = properties;
	const payloads = [];
	const updatedProperties = Object.keys(properties);

	payloads.push({
		action,
		code,
		type: nodeType,
		updatedProperties,
	});
	const relatedRecords = findRelatedRecords(
		neo4jEntity.records,
		code,
		updatedProperties,
	);
	relatedRecords.forEach(
		({ relatedCode, relatedType, relatedProperties }) => {
			payloads.push({
				action: relatedAction,
				code: relatedCode,
				type: relatedType,
				updatedProperties: relatedProperties,
			});
		},
	);
	return payloads;
};

const uniquePayloads = payloads => {
	const groupedEvents = groupBy(
		payloads,
		({ action, code, type }) => `${action}:${code}:${type}`,
	);
	return Object.values(groupedEvents).map(events => {
		const updatedPropertiesList = events.map(
			event => event.updatedProperties,
		);
		const updatedProperties = [
			...new Set([].concat(...updatedPropertiesList)),
		].sort();
		// Merge to first event object
		return Object.assign(events[0], {
			updatedProperties,
		});
	});
};

const logChanges = ({
	action,
	relatedAction = 'UPDATE',
	record = null,
	adaptor = KinesisAdaptor(TREECREPER_EVENT_LOG_STREAM_NAME),
}) => {
	if (!['DELETE', 'CREATE', 'UPDATE'].includes(action)) {
		logger.error(
			{
				event: 'INVALID_LOG_CHANGE_ACTION',
			},
			`Invalid action: ${action}. action must be either of CREATE/UPDATE/DELETE`,
		);
	}
	const payloads = makePayloads(action, relatedAction, record);
	const publisher = createPublisher(adaptor);
	uniquePayloads(payloads).forEach(payload =>
		publisher.publish(adaptor, payload),
	);
};

module.exports = {
	logChanges,
};
