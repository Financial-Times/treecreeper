const crud = require('./_crud');

const get = (req, res) => {
	return crud.get(req, res, 'Submission');
};

const create = async (req, res) => {
	crud.create(req, res, req.body.node, 'Submission', [
		{name:'SUBMITS', from: 'Contract', fromId: req.body.node.contractId, to: 'Submission', toId: req.body.node.id},
		{name:'ANSWERS', from: 'Submission', fromId: req.body.node.id, to: 'Survey', toId: req.body.node.surveyId}
	]);

	for (let answer of req.body.answers) {
		crud.create(req, res, answer, 'SubmissionAnswer', [
			{name:'HAS', from: 'Submission', fromId: req.body.node.id, toId: answer.id, to: 'SubmissionAnswer'},
			{name:'ANSWERS_QUESTION', from: 'SubmissionAnswer', fromId: answer.id, toId: answer.id, to: 'SurveyQuestion'}
		]);
	}
};

const update = async (req, res) => {
	return crud.update(req, res, req.body.node, 'Submission');
};

const remove = async (req, res) => {
	return crud.remove(req, res, 'Submission', true);
};

const getAllforOne = async (req, res) => {
	return crud.getAllforOne(req, res, {name:'SUBMITS', from: 'Contract', to: 'Submission'}, req.params.contractId);
};

module.exports = { get, getAllforOne, create, update, remove };
