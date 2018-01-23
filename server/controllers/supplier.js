const crud = require('./_crud');


const create = async (req, res) => {
	console.log('\nattempting to create supplier', req.body);
	await crud.create(req, res, req.body.node, 'Supplier');

	for (let contract of req.body.contracts) {
		console.log('attempting to create supplier contract', contract);
		crud.create(req, res, contract, 'Contract', [
			{name:'SIGNS', from: 'Supplier', fromId: req.body.node.id, toId: contract.id, to: 'Contract'},
		]);
	}
};

module.exports = { create };
