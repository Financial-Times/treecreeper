const db = require('../db-connection');

const crud = require('./_crud');

const get = (req, res) => {
	return crud.get(req, res, 'Contract');
};

const create = async (req, res) => {
	return crud.create(req, res, 'Contract', {name:'SIGNS', from: 'Supplier', to: 'Contract'});
};

const update = async (req, res) => {
	return crud.update(req, res, 'Contract');
};

const remove = async (req, res) => {
	return crud.remove(req, res, 'Contract', true);
};

const getAll = async (req, res) => {
	try {
		const query = `MATCH p=(Supplier {id: "${req.params.supplierId}"})-[r:SIGNS]->(Contract) RETURN p`;
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
