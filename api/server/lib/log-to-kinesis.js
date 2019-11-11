const groupBy = require('lodash.groupby');
const { getType } = require('../../../packages/tc-schema-sdk');
const { getContext } = require('./request-context');
const EventLogWriter = require('./event-log-writer');
const Kinesis = require('./kinesis-client');

const {
	findPropertyNames,
	findInversePropertyNames,
	invertDirection,
	addRecursiveProperties,
} = require('./schema-helpers');

const kinesisClient = new Kinesis(
	process.env.CRUD_EVENT_LOG_STREAM_NAME || 'test-stream-name',
);

const eventLogWriter = new EventLogWriter(kinesisClient);

const flatten = arr => [...new Set([].concat(...arr))].sort();
const pluck = (arr, prop) => arr.map(obj => obj[prop]);

const flattenEvents = ({ requestId, clientId, clientUserId }) => events =>
	Object.assign(events[0], {
		requestId,
		clientId,
		clientUserId,
		updatedProperties: flatten(pluck(events, 'updatedProperties')),
	});

const sendUniqueEvents = events => {
	Object.values(
		groupBy(
			events,
			({ action, code, type }) => `${action}:${code}:${type}`,
		),
	)
		.map(flattenEvents(getContext()))
		.forEach(event => eventLogWriter.sendEvent(event));
};

const relatedRecordEvents = (newRecords, addedRelationships) => {
	const nodeType = newRecords[0].get('node').labels[0];
	const { requestId } = getContext();
	const { properties: validProperties } = getType(nodeType);

	const addedRelationshipNames = Object.keys(addedRelationships);

	const createdNodes = newRecords
		.map(record => {
			// If created the related node, it's a CREATE on it
			if (record.get('relatedRequestId') === requestId) {
				return {
					code: record.relatedCode(),
					type: record.relatedType(),
				};
			}
		})
		.filter(it => !!it);

	const events = [];

	Object.entries(validProperties)
		.filter(([name]) => addedRelationshipNames.includes(name))
		.forEach(([name, { type, direction, relationship }]) => {
			const updatedProperties = findPropertyNames({
				rootType: type,
				relationship,
				direction: invertDirection(direction),
				destinationType: nodeType,
			});

			addedRelationships[name].forEach(code => {
				const isCreated = createdNodes.some(
					({ code: refCode, type: refType }) =>
						type === refType && code === refCode,
				);
				events.push({
					action: isCreated ? 'CREATE' : 'UPDATE',
					code,
					type,
					updatedProperties: isCreated
						? ['code'].concat(updatedProperties).sort()
						: updatedProperties,
				});
			});
		});
	return events;
};

const logNodeChanges = ({
	result,
	removedRelationships,
	addedRelationships,
	updatedProperties = [],
}) => {
	const newRecords = result.records;
	const node = newRecords[0].get('node');
	const nodeType = node.labels[0];
	const { requestId } = getContext();

	const events = [];

	if (updatedProperties.length) {
		events.push({
			action:
				node.properties._createdByRequest === requestId
					? 'CREATE'
					: 'UPDATE',
			code: node.properties.code,
			type: nodeType,
			updatedProperties: addRecursiveProperties(
				updatedProperties,
				nodeType,
			).sort(),
		});

		if (Object.keys(addedRelationships).length) {
			events.push(...relatedRecordEvents(newRecords, addedRelationships));
		}
	}

	if (removedRelationships) {
		const { properties } = getType(nodeType);

		Object.entries(removedRelationships).forEach(([propName, codes]) => {
			codes.forEach(code =>
				events.push({
					action: 'UPDATE',
					code,
					type: properties[propName].type,
					updatedProperties: findInversePropertyNames(
						nodeType,
						propName,
					),
				}),
			);
		});
	}

	sendUniqueEvents(events);
};

const logNodeDeletion = node => {
	const { requestId, clientId, clientUserId } = getContext();
	eventLogWriter.sendEvent({
		action: 'DELETE',
		code: node.properties.code,
		type: node.labels[0],
		requestId,
		clientId,
		clientUserId,
	});
};

module.exports = {
	logNodeDeletion,
	logNodeChanges,
};
