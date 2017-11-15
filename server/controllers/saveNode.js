const db = require('../db-connection');

module.exports = async (req, res) => {

	// TODO use constraint instead
	const existsQuery = `
		MATCH (a:${res.locals.nodeType} {id: $id})
		RETURN a
	`;

	const existing = await (db.run(existsQuery, req.body));

	if (existing.records.length) {
		return res.status(400).end('Record already exists. Try updating.');
	}

	const createQuery = `
		CREATE (a:${res.locals.nodeType} {name: $name, id: $id})
		RETURN a
	`;

	const result = await db.run(createQuery, req.body);

	if (req.body.relationship) {
		const relQuery = `
			MATCH (a:${res.locals.nodeType}),(b:${res.locals.targetNodeType})
			WHERE a.id = '${req.body.id}'
			AND b.id = '${req.body.relationship.targetNode.id}'
			CREATE (a)-[r:OWNEDBY]->(b)
			RETURN r
		`;

		const resultRel = await db.run(relQuery);
		console.log(resultRel);
		res.send(resultRel);
	}
	else {
		res.send(result);
	}
};
