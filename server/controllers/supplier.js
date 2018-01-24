const crud = require('./_crud');

// TODO can be made generic
const create = async (req, res) => {
	console.log('\nattempting to create supplier', req.body);
	await crud.create(res, req.body.node, 'Supplier', null, 'id');

	for (let contract of req.body.contracts) {
		console.log('attempting to create supplier contract', contract);
		crud.create(res, contract, 'Contract', [
			{name:'SIGNS', from: 'Supplier', fromId: req.body.node.id, toId: contract.id, to: 'Contract'},
		], 'id');
	}
};

module.exports = { create };
