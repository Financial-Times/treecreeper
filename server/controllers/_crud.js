const db = require('../db-connection');

const get = async (req, res, nodeType) => {
	try {
		const query = `MATCH (a:${nodeType} {id: "${req.params.id}"}) RETURN a`;
		const result = await db.run(query);

		if (result.records.length) {
			return res.send(result.records[0]._fields[0].properties);
		}
		else {
			return res.status(404).end(`${nodeType} ${req.params.id} not found`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

const create = async (req, res, nodeType, relationship) => {
	const createQuery = `CREATE (a:${nodeType} {name: $name, id: $id})	RETURN a`;

	try {
		const result = await db.run(createQuery, req.body);
				console.log('created node');

		if (relationship) {
			const createRelationship = `
				MATCH (a:${relationship.from}),(b:${relationship.to})
				WHERE a.id = '${req.body.supplierId}'
				AND b.id = '${req.body.id}'
				CREATE (a)-[r:${relationship.name}]->(b)
				RETURN r
			`;

			try {
				// TODO use single transaction
				// fail both if either fails
				const resultRel = await db.run(createRelationship, req.body);

				// console.log(result);
				// console.log(resultRel);

				console.log('created relationship');

				// TODO check node created, check REL created
				return res.status(200).end('Contract and link to Supplier created');
			}
			catch (e) {
				return res.status(400).end(e.toString());
			}
		}
		res.send(result.records[0]._fields[0].properties);
	}
	catch (e) {
		return res.status(400).end(e.toString());
	}
};

const update = async (req, res, nodeType) => {
	try {
		const query = `
			MATCH (a:${nodeType} {id: "${req.body.id}"})
			SET a = $props
			RETURN a
		`;
		const result = await db.run(query, {props: req.body});

		if (result.records.length) {
			return res.send(result.records[0]._fields[0].properties);
		}
		else {
			return res.status(404).end(`${nodeType}${req.body.id} not found. No nodes updated.`);
		}

		res.send(result);
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

const remove = async (req, res, nodeType, detach) => {
	try {
		const result = await db.run(`MATCH (a:${nodeType} {id: "${req.params.id}"})${detach ? ' DETACH' : ''} DELETE a`);

		if (result && result.summary && result.summary.counters && result.summary.counters.nodesDeleted() === 1) {
			return res.status(200).end(`${req.params.id} deleted`);
		}
		else {
			return res.status(404).end(`${req.params.id} not found. No nodes deleted.`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

module.exports = { get, create, update, remove };
