const crud = require('./_crud');

// TODO can be made generic
const create = async (req, res) => {
	console.log('\nattempting to create supplier', req.body);
	await crud.create(res, 'Supplier', 'id', req.body.node.id, req.body.node);

	for (let contract of req.body.contracts) {
		console.log('attempting to create supplier contract', contract);
		crud.create(res, 'Contract', 'id', contract.id, contract, [
			{name:'SIGNS', from: 'Supplier', fromId: req.body.node.id, toId: contract.id, to: 'Contract'},
		]);
	}
};

module.exports = { create };
