const db = require('../db-connection');

const get = async (req, res) => {
	try {
		const query = `MATCH (a:Contract {id: "${req.params.id}"}) RETURN a`;
		const result = await db.run(query);

		res.send(result)

		if (result.records.length) {
			return res.send(result.records[0]._fields[0].properties);
		}
		else {
			return res.status(404).end(`Contract ${req.params.id} not found`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

const create = async (req, res) => {
	const createQuery = 'CREATE (a:Contract {name: $name, id: $id})	RETURN a';

	const createRelationship = `
		MATCH (a:Supplier),(b:Contract)
		WHERE a.id = '${req.body.supplierId}'
		AND b.id = '${req.body.id}'
		CREATE (a)-[r:SIGNS]->(b)
		RETURN r
	`;

	try {
		// TODO use single transaction
		// fail both if either fails
		const resultNode = await db.run(createQuery, req.body);
		const resultRel = await db.run(createRelationship, req.body);

		// TODO check node created, check REL created
		return res.status(200).end('Contract and link to Supplier created');
	}
	catch (e) {
		return res.status(400).end(e.toString());
	}
};

const update = async (req, res) => {
	try {
		const query = `
			MATCH (a:Contract {id: "${req.body.id}"})
			SET a = $props
			RETURN a
		`;
		const result = await db.run(query, {props: req.body});

		if (result.records.length) {
			return res.send(result.records[0]._fields[0].properties);
		}
		else {
			return res.status(404).end(`Contract ${req.body.id} not found. No nodes updated.`);
		}

		res.send(result);
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

const remove = async (req, res) => {
	try {
		const result = await db.run(`MATCH (a:Contract {id: "${req.params.id}"}) DETACH DELETE a`);

		if (result && result.summary && result.summary.counters && result.summary.counters.nodesDeleted() === 1) {
			return res.status(200).end(`${req.params.id} deleted`);
		}
		else {
			return res.status(404).end(`Contract ${req.params.id} not found. No nodes deleted.`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};


const getAll = async (req, res) => {
	try {
		const query = `MATCH p=({id: "${req.params.supplierId}"})-[r:SIGNS]->() RETURN p`;
		const result = await db.run(query);

		if (result.records.length) {
			return res.send(result.records);
		}
		else {
			return res.status(404).end(`No contracts found for supplier ${req.params.supplierId}`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
}

module.exports = { get, getAll, create, update, remove };
