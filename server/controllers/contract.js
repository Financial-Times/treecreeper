const crud = require('./_crud');

const get = (req, res) => {
	return crud.get(req, res, 'Contract');
};

const create = async (req, res) => {
	return crud.create(req, res, req.body.node, 'Contract', [{name:'SIGNS', from: 'Supplier', to: 'Contract'}]);
};

const update = async (req, res) => {
	return crud.update(req, res, req.body.node, 'Contract');
};

const remove = async (req, res) => {
	return crud.remove(req, res, 'Contract', true);
};

const getAll = async (req, res) => {
	return crud.getAll(req, res, {name:'SIGNS', from: 'Supplier', to: 'Contract'}, req.params.contractId);
};

module.exports = { get, getAll, create, update, remove };
