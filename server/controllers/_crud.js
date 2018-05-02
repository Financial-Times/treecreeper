'use strict';

const { oneLine } = require('common-tags');
const {session: db} = require('../db-connection');
const eventLog = require('../lib/eventLog');

const sendEvent = (event) =>
	eventLog.sendEvent(event)
		.catch((error) => {
			logger.error('Failed to send event to event log', {event});
		})

const lookupField = (record, fieldName) => record._fields[record._fieldLookup[fieldName]];

const _createRelationships = async (relationships, upsert) => {
	let resultRel;

	for (let relationship of relationships) {
		const {
			from,
			fromUniqueAttrName,
			fromUniqueAttrValue,
			to,
			toUniqueAttrName,
			toUniqueAttrValue,
			name,
		} = relationship;

		const createRelationshipAndNode = oneLine`
			MERGE (a:${from} {${fromUniqueAttrName}: '${fromUniqueAttrValue}'})
			MERGE (b:${to} {${toUniqueAttrName}: '${toUniqueAttrValue}'})
			MERGE (a)-[r:${name}]->(b)
			RETURN r
		`;

		const createRelationshipAlone = oneLine`
			MATCH (a:${from}),(b:${to})
			WHERE a.${fromUniqueAttrName} = '${fromUniqueAttrValue}'
			AND b.${toUniqueAttrName} = '${toUniqueAttrValue}'
			CREATE (a)-[r:${name}]->(b)
			RETURN r
		`;

		const query = upsert === 'upsert' ? createRelationshipAndNode : createRelationshipAlone;
		console.log('[CRUD] relationship query', query);

		try {
			let oneResultRel = await db.run(query);
			if (oneResultRel.records && oneResultRel.records.length > 0) {
				resultRel = oneResultRel;
			}
			[
				{
					code: fromUniqueAttrValue,
					type: from,
					direction: 'to',
					relatedCode: toUniqueAttrValue,
					relatedType: to,
				},
				{
					code: toUniqueAttrValue,
					type: to,
					direction: 'from',
					relatedCode: fromUniqueAttrValue,
					relatedType: from,
				},
			].forEach(({ code, type, relatedCode, relatedType, direction }) =>
				sendEvent({
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						type: name,
						direction,
						relatedCode,
						relatedType,
					},
					code,
					type,
				})
			);
		} catch (e) {
			console.log('[CRUD] Relationship not created', e.toString());
		}
	}
	return resultRel;
};

const get = async (res, nodeType, uniqueAttrName, uniqueAttr, relationships) => {
	console.log('[CRUD] get', nodeType, uniqueAttrName, uniqueAttr, relationships);

	try {
		const filter = uniqueAttrName && uniqueAttr ? `{${uniqueAttrName}: "${uniqueAttr}"}` : '';
		const related = relationships ? '-[r]-(c)' : '';
		const returned = relationships ? 'a,r,c' : 'a';

		const query = `MATCH (a:${nodeType} ${filter}) ${related} RETURN ${returned}`;

		console.log('[CRUD]', query);

		const result = await db.run(query);

		if (!result.records.length) {
			return res.status(404).send(`${nodeType} ${uniqueAttr ? uniqueAttr : ''} not found`);
		}

		let formattedResult = [];
		let previousID = null;
		let oneResult;
		result.records.forEach(record => {
			const currentID = lookupField(record, 'a').identity.low;
			if (previousID !== currentID) {
				if (previousID) {
					formattedResult.push(oneResult);
				}
				oneResult = lookupField(record, 'a').properties;
				if (relationships) {
					oneResult.relationships = [];
				}
				previousID = currentID;
			}
			if (relationships) {
				const to = lookupField(record, 'c');
				oneResult.relationships.push({
					name: lookupField(record, 'r').type,
					from: nodeType,
					fromUniqueAttrName: uniqueAttrName,
					fromUniqueAttrValue: uniqueAttr,
					to: to.labels[0],
					toUniqueAttrName: 'id',
					toUniqueAttrValue: to.properties.id,
				});
			}
		});
		if (previousID) {
			formattedResult.push(oneResult);
		}

		console.log('[CRUD] GET formatted result');
		console.log(JSON.stringify(formattedResult, null, 2));

		return res.send(formattedResult);
	} catch (e) {
		console.log(e.toString());
		return res.status(500).send(e.toString());
	}
};

const create = async (res, nodeType, uniqueAttrName, uniqueAttr, obj, relationships, upsert) => {
	console.log('[CRUD] create', nodeType, uniqueAttrName, uniqueAttr, obj, relationships, upsert);

	if (uniqueAttrName) {
		const existingNode = `MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"}) RETURN a`;

		console.log('[CRUD] exists query', existingNode);

		const result = await db.run(existingNode);
		if (result.records.length > 0) {
			console.log(
				nodeType,
				uniqueAttr,
				uniqueAttrName,
				'ALREADY EXISTS',
				JSON.stringify(result.records, null, 2)
			);
			return res.status(400).send(`node with ${uniqueAttrName}=${obj[uniqueAttrName]} already exists`);
		}
	}

	try {
		// Make sure if we've said there is a primary key, then it is in the obj
		if (uniqueAttrName) {
			obj[uniqueAttrName] = uniqueAttr;
		}

		let response;

		if (nodeType) {
			const createQuery = `CREATE (a:${nodeType} $node) RETURN a`;
			console.log('[CRUD] query', createQuery);
			const result = await db.run(createQuery, { node: obj });
			sendEvent({
				event: 'CREATED_NODE',
				action: 'CREATE',
				code: uniqueAttr,
				type: nodeType,
			});
			if (!relationships) {
				return res.send(lookupField(result.records[0], 'a').properties);
			}
		}

		if (relationships) {
			const resultRel = await _createRelationships(relationships, upsert);

			if (!resultRel) {
				return res.status(400).send('error creating relationships');
			}

			return res.send(resultRel.records[0]._fields);
		}
	} catch (e) {
		console.log(`${nodeType} not created`, e.toString());
		return res.status(400).send(e.toString());
	}
};

const update = async (res, nodeType, uniqueAttrName, uniqueAttr, obj, relationships, upsert) => {
	console.log('[CRUD] updating', obj, nodeType, uniqueAttrName, uniqueAttr);
	try {
		const updateQuery = oneLine`
			MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"})
			SET a += $props
			RETURN a
		`;

		console.log('[CRUD] query', updateQuery);

		const result = await db.run(updateQuery, { props: obj });

		console.log('[CRUD] records', result.records);

		if (result.records.length === 0) {
			if (upsert) {
				const createQuery = `CREATE (a:${nodeType} $node) RETURN a`;

				if (uniqueAttrName) {
					obj[uniqueAttrName] = uniqueAttr;
				}

				console.log('[CRUD] create query (upsert)', createQuery);
				await db.run(createQuery, { node: obj });
			} else {
				const message = `${nodeType}${uniqueAttr} not found. No nodes updated.`;
				console.log(message);
				return res.status(404).send(message);
			}
		}

		sendEvent({
			event: 'UPDATED_NODE',
			action: 'UPDATE',
			code: uniqueAttr,
			type: nodeType,
		});

		if (relationships) {
			let resultRel = await _createRelationships(relationships, upsert);

			console.log('RESULT REL, RETURNING', resultRel);

			if (!resultRel) {
				return res.status(400).send('error creating relationships');
			}

			return res.send(resultRel.records[0]._fields);
		}

		return res.send(
			result.records && result.records.length ? lookupField(result.records[0], 'a').properties : result
		);
	} catch (e) {
		console.log('[CRUD] update error', e);
		return res.status(500).send(e.toString());
	}
};

const remove = async (res, nodeType, uniqueAttrName, uniqueAttr, mode) => {
	try {
		const deleteQuery = oneLine`
			MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"}) ${
			mode === 'detach'
				? `OPTIONAL MATCH (a)-[r]-(b)
					WITH a, b, r, TYPE(r) as relationshipType
					DELETE a,r
					RETURN
						relationshipType,
						b.${uniqueAttrName} as nodeId,
						labels(b) as nodeLabels,
						startNode(r).${uniqueAttrName} as startNodeId`
				: 'DELETE a'
		}`;
		console.log('[CRUD] delete query', deleteQuery);

		const result = await db.run(deleteQuery);
		console.log('RESULT', result);
		if (
			result &&
			result.summary &&
			result.summary.counters &&
			result.summary.counters.nodesDeleted() >= 1
		) {
			result.records
				.map(record => ({
					relationshipType: lookupField(record, 'relationshipType'),
					nodeId: lookupField(record, 'nodeId'),
					nodeLabels: lookupField(record, 'nodeLabels'),
				}))
				.forEach(({ relationshipType, nodeId, nodeLabels }) => {
					const direction = uniqueAttr === lookupField(record, 'startNodeId') ? 'from' : 'to';
					sendEvent({
						event: 'DELETED_RELATIONSHIP',
						action: 'UPDATE',
						relationship: {
							type: relationshipType,
							direction,
							relatedCode: uniqueAttr,
							relatedType: nodeType,
						},
						code: nodeId,
						type: nodeLabels[0],
					});
				});
			sendEvent({
				event: 'DELETED_NODE',
				action: 'DELETE',
				code: uniqueAttr,
				type: nodeType,
			});
			return res.status(200).send(`${uniqueAttr} deleted`);
		} else {
			return res.status(404).send(`${uniqueAttr} not found. No nodes deleted.`);
		}
	} catch (e) {
		return res.status(500).send(e.toString());
	}
};

const getAllforOne = async (res, relationship, param) => {
	try {
		// TODO
		// use uniqueattr value and name instead of id
		// used by webPMA contract controller
		const query = oneLine`MATCH p=(${relationship.from} {id: "${param}"})-[r:${relationship.name}]->(${
			relationship.to
		}) RETURN p`;
		console.log('[CRUD] all for one query', query);

		const result = await db.run(query);

		if (result.records.length) {
			const elements = result.records.map(node => {
				return lookupField(record, 'p').end.properties;
			});
			return res.send(elements);
		} else {
			return res.status(404).send(`No ${relationship.to} found for ${relationship.from} ${param}`);
		}
	} catch (e) {
		return res.status(500).send(e.toString());
	}
};

const getAll = async (res, nodeType, filters = '') => {
	try {
		const query = `MATCH (a:${nodeType} ${filters}) RETURN a`;
		console.log('[CRUD] get all query', query);

		const result = await db.run(query);

		if (result.records.length) {
			const elements = result.records.map(node => {
				return lookupField(record, 'a').properties;
			});

			return res.send(elements);
		} else {
			return res.status(404).send(`No ${nodeType} found`);
		}
	} catch (e) {
		return res.status(500).send(e.toString());
	}
};

module.exports = { get, create, _createRelationships, update, remove, getAll, getAllforOne };
