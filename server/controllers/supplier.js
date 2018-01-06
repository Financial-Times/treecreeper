const crud = require('./_crud');

const get = (req, res) => {
	return crud.get(req, res, 'Supplier');
};

const create = async (req, res) => {
	console.log('\n\ncreating supplier', req.body);
	await crud.create(req, res, req.body.node, 'Supplier');

	for (let contract of req.body.contracts) {
		console.log('\ncreating supplier contract', contract);
		crud.create(req, res, contract, 'Contract', [
			{name:'SIGNS', from: 'Supplier', fromId: req.body.node.id, toId: contract.id, to: 'Contract'},
		]);
	}
};

const update = async (req, res) => {
	return crud.update(req, res, req.body.node, 'Supplier');
};

const remove = async (req, res) => {
	return crud.remove(req, res, 'Supplier');
};

const getAll = async (req, res) => {
	return crud.getAll(req, res, 'Supplier');
};

module.exports = { get, create, update, remove, getAll };
