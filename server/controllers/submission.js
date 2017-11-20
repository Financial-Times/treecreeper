const crud = require('./_crud');

const get = (req, res) => {
	return crud.get(req, res, 'Submission');
};

const create = async (req, res) => {
	crud.create(req, res, req.body.node, 'Submission', [
		{name:'SUBMITS', from: 'Contract', to: 'Submission'},
		{name:'ANSWERS', from: 'Submission', to: 'Survey'}
	]);

	for (let answer of req.body.answers) {
		crud.create(req, res, answer, 'SubmissionAnswer', [
			{name:'HAS', from: 'Submission', to: 'SubmissionAnswer'},
			{name:'ANSWERS_QUESTION', from: 'SubmissionAnswer', to: 'SurveyQuestion'}
		]);
	}
};

const update = async (req, res) => {
	return crud.update(req, res, req.body.node, 'Submission');
};

const remove = async (req, res) => {
	return crud.remove(req, res, 'Submission', true);
};

const getAll = async (req, res) => {
	return crud.getAll(req, res, {name:'SUBMITS', from: 'Contract', to: 'Submission'}, req.params.contractId);
};

module.exports = { get, getAll, create, update, remove };
