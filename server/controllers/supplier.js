const db = require('../db-connection');

const get = async (req, res) => {
	try {
		const query = `MATCH (a:Supplier {id: "${req.params.id}"}) RETURN a`;
		const result = await db.run(query);

		if (result.records.length) {
			return res.send(result.records[0]._fields[0].properties);
		}
		else {
			return res.status(404).end(`${req.params.id} not found`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

const create = async (req, res) => {
	const createQuery = 'CREATE (a:Supplier {name: $name, id: $id})	RETURN a';

	try {
		const result = await db.run(createQuery, req.body);
		res.send(result.records[0]._fields[0].properties);
	}
	catch (e) {
		return res.status(400).end(e.toString());
	}
};

const update = async (req, res) => {
	try {
		const query = `
			MATCH (a:Supplier {id: "${req.body.id}"})
			SET a = $props
			RETURN a
		`;
		const result = await db.run(query, {props: req.body});

		if (result.records.length) {
			return res.send(result.records[0]._fields[0].properties);
		}
		else {
			return res.status(404).end(`${req.body.id} not found. No nodes updated.`);
		}

		res.send(result);
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

const remove = async (req, res) => {
	try {
		const result = await db.run(`MATCH (a:Supplier {id: "${req.params.id}"}) DELETE a`);

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
