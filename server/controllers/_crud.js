const db = require('../db-connection');

const get = async (res, nodeType, uniqueAttrName, uniqueAttr) => {
	console.log('[CRUD] get', nodeType, uniqueAttrName, uniqueAttr);

	try {

		const filter = uniqueAttrName && uniqueAttr ? `{${uniqueAttrName}: "${uniqueAttr}"}` : '';

		const query = `MATCH (a:${nodeType} ${filter}) RETURN a`;

		console.log('[CRUD]', query);

		const result = await db.run(query);

		if (!result.records.length) {
			return res.status(404).end(`${nodeType} ${uniqueAttr ? uniqueAttr : ''} not found`);
		}

		const formattedResult = result.records.map(record => record._fields[0].properties);

		console.log('[CRUD] GET formatted result');
		console.log(JSON.stringify(formattedResult, null, 2));

		return res.send(formattedResult);

	}
	catch (e) {
		console.log(e.toString());
		return res.status(500).end(e.toString());
	}
};

const create = async (res, nodeType, uniqueAttrName, uniqueAttr, obj, relationships, upsert) => {

	console.log('[CRUD] create', nodeType, uniqueAttrName, uniqueAttr, obj, relationships, upsert);

	if (uniqueAttrName) {
		const existingNode = `MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"}) RETURN a`;
		const result = await db.run(existingNode);
		if (result.records.length > 0) {
			console.log(nodeType, uniqueAttr, uniqueAttrName, 'ALREADY EXISTS', JSON.stringify(result.records, null, 2));
			return res.status(400).end(`node with ${uniqueAttrName}=${obj[uniqueAttrName]} already exists`);
		}
	}

	const createQuery = `CREATE (a:${nodeType} $node) RETURN a`;

	try {

		// Make sure if we've said there is a primary key, then it is in the obj
		if (uniqueAttrName) {
			obj[uniqueAttrName] = uniqueAttr;
		}

		const result = await db.run(createQuery, {node: obj});
		console.log('****** createQuery', createQuery, obj)

		if (relationships) {
			for (let relationship of relationships) {
				const createRelationshipAndNode = `
					MATCH (a:${relationship.from})
					WHERE a.${relationship.fromUniqueAttrName} = '${relationship.fromUniqueAttrValue}'
					MERGE (a)-[r:${relationship.name}]->(b:${relationship.to} {${relationship.toUniqueAttrName}: '${relationship.toUniqueAttrValue}'})
					RETURN r
				`;

				const createRelationshipAlone = `
					MATCH (a:${relationship.from}),(b:${relationship.to})
					WHERE a.${relationship.fromUniqueAttrName} = '${relationship.fromUniqueAttrValue}'
					AND b.${relationship.toUniqueAttrName} = '${relationship.toUniqueAttrValue}'
					CREATE (a)-[r:${relationship.name}]->(b)
					RETURN r
				`;

				const query = upsert === 'upsert' ? createRelationshipAndNode : createRelationshipAlone;

				console.log('************** createRelationship')
				console.log(query)

				try {
					const resultRel = await db.run(query, obj);

					console.log(JSON.stringify(resultRel, null, 2));

					if (!resultRel.records || resultRel.records.length === 0) {
						throw new Error(`Relationship ${relationship.from} -[${relationship.name}]-> ${relationship.to} not created. Aborting.`);
					}
				}
				catch (e) {
					console.log('[CRUD] Relationships not created', e.toString());
					return res.status(400).end(e.toString());
				}
			}
			return res.send(result.records[0]._fields[0].properties);
		}
		return res.send(result.records[0]._fields[0].properties);
	}
	catch (e) {
		console.log(`${nodeType} not created`, e.toString());
		return res.status(400).end(e.toString());
	}
};

const update = async (res, nodeType, uniqueAttrName, uniqueAttr, obj, upsert) => {
	console.log('[CRUD] updating', obj, nodeType, uniqueAttrName, uniqueAttr);
	try {
		const updateQuery = `
			MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"})
			SET a += $props
			RETURN a
		`;

		const result = await db.run(updateQuery, {props: obj});

		const propAmount = result.summary && result.summary.updateStatistics ? result.summary.updateStatistics.propertiesSet() : 0;

		if (result.records.length && propAmount > 0) {
			return res.send(result.records[0]._fields[0].properties);
		}
		else if (upsert === 'upsert') {
			const createQuery = `CREATE (a:${nodeType} $node) RETURN a`;

			if (uniqueAttrName) {
				obj[uniqueAttrName] = uniqueAttr;
			}

			const createResult = await db.run(createQuery, {node: obj});
			return res.send(createResult.records[0]._fields[0].properties);
		}
		else {
			return res.status(404).end(`${propAmount} props updated. ${nodeType}${uniqueAttr} not found. No nodes updated.`);
		}

		res.send(result);
	}
	catch (e) {
		console.log('[CRUD] update error', e);
		return res.status(500).end(e.toString());
	}
};

const remove = async (res, nodeType, uniqueAttrName, uniqueAttr, mode) => {

	try {
		const result = await db.run(`MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"})${mode === 'detach' ? ' DETACH' : ''} DELETE a`);
		if (result && result.summary && result.summary.counters && result.summary.counters.nodesDeleted() === 1) {
			return res.status(200).end(`${uniqueAttr} deleted`);
		}
		else {
			return res.status(404).end(`${uniqueAttr} not found. No nodes deleted.`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};


const getAllforOne = async (res, relationship, param) => {
	try {
		// TODO
		// use uniqueattr value and name instead of id
		// used by webPMA contract controller
		const query = `MATCH p=(${relationship.from} {id: "${param}"})-[r:${relationship.name}]->(${relationship.to}) RETURN p`;
		const result = await db.run(query);

		if (result.records.length) {
			const elements = result.records.map((node) => {
				return node._fields[0].end.properties;
			});
			return res.send(elements);
		}
		else {
			return res.status(404).end(`No ${relationship.to} found for ${relationship.from} ${param}`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};


const getAll = async (res, nodeType, filters = '') => {

	try {
		const query = `MATCH (a:${nodeType} ${filters}) RETURN a`;
		const result = await db.run(query);

		if (result.records.length) {
			const elements = result.records.map((node) => {
				return node._fields[0].properties;
			});

			return res.send(elements);
		}
		else {
			return res.status(404).end(`No ${nodeType} found`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

module.exports = { get, create, update, remove, getAll, getAllforOne };
