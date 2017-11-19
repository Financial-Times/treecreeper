const crud = require('./_crud');

const get = (req, res) => {
	return crud.get(req, res, 'Supplier');
};

const create = async (req, res) => {
	return crud.create(req, res, 'Supplier');
};

const update = async (req, res) => {
	return crud.update(req, res, 'Supplier');
};

const remove = async (req, res) => {
	return crud.remove(req, res, 'Supplier');
};

module.exports = { get, create, update, remove };
