const crud = require('./_crud');

// TODO can be made generic
const create = async (req, res) => {
	console.log('\nattempting to create supplier', req.body);
	await crud.create(res, 'Supplier', 'id', req.body.node.id, req.body.node);

	//create contracts and submissions
	for (let contract of req.body.contracts) {
		console.log('attempting to create supplier contract', contract);
		const {dt} = contract;
		const contractDetails = contract;
		delete contractDetails.dt;
		crud.create(res, 'Contract', 'id', contract.id, contractDetails, [
			{name:'SIGNS', from: 'Supplier', fromUniqueAttrName: 'id',fromUniqueAttrValue: req.body.node.id, toUniqueAttrName: 'id', toUniqueAttrValue: contract.id, to: 'Contract'},
		]);
		for(let survey of dt){
			const submissionNode = {
				id: survey.id + contract.id,
				surveyId: survey.id,
				contractId: contract.id,
				status: 'pending',
				type: null,
			};
			crud.create(res, 'Submission', 'id', submissionNode.id, submissionNode, [
				{name:'SUBMITS', from: 'Contract', fromUniqueAttrName: 'id', fromUniqueAttrValue: submissionNode.contractId, to: 'Submission', toUniqueAttrName: 'id', toUniqueAttrValue: submissionNode.id},	
				{name:'ANSWERS', from: 'Submission', fromUniqueAttrName: 'id', fromUniqueAttrValue: submissionNode.id, to: 'Survey', toUniqueAttrName: 'id', toUniqueAttrValue: submissionNode.surveyId}
			]);
		}
		
	}
};

module.exports = { create };
