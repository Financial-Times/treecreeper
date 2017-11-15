const db = require('../db-connection');

module.exports = async (req, res) => {
	const result = await db.run(`MATCH (a:${res.locals.nodeType} {id: $id}) DELETE a`, req.body);
	res.send(result);
};
