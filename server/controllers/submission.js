const crud = require('./_crud');
const db = require('../db-connection');

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
	try {
		const query = `MATCH p=(Contract {id: "${req.params.contractId}"})-[r:SUBMITS]->(Submission {surveyId: "${req.params.surveyId}"})-[y:HAS]->(SubmissionAnswer)-[z:ANSWERS_QUESTION]->(SurveyQuestion) RETURN p`;
		const result = await db.run(query);
		let submissionObj = {};

		if (result.records.length) {
			for (const record of result.records) {
				for (const field of record._fields) {
					let submissionAnswer;
					let surveyQuestion;

					for (const segment of field.segments) {
						switch(segment.relationship.type) {
							case 'HAS':
								submissionAnswer = submissionAnswer || segment.end.properties;

								if (!submissionObj[submissionAnswer.id]) {
									submissionObj[submissionAnswer.id] = {
										answer: submissionAnswer.text,
									};
								}
								else {
									submissionObj[submissionAnswer.id].answer = submissionAnswer.text;
								}
							break;
							case 'ANSWERS_QUESTION':
								surveyQuestion = surveyQuestion || segment.end.properties;

								if (!submissionObj[surveyQuestion.id]) {
									submissionObj[surveyQuestion.id] = {
										question: surveyQuestion.text,
									};
								}
								else {
									submissionObj[surveyQuestion.id].question = surveyQuestion.text;
								}
							break;
						}
					}
				}
			}
			res.send(submissionObj);
		}
		else {
			console.log('404');
			return res.status(404).end(`No ${req.params.surveyId} survey answers found for contract ${req.params.contractId}`);
		}
	}
	catch (e) {
		console.log(e);
		return res.status(500).end(e.toString());
	}
};

module.exports = { get, getAllforOne, create, update, remove };
