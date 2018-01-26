const crud = require('./_crud');
const db = require('../db-connection');

const create = async (req, res) => {

	console.log('SUBMISSION', req.body);

	const topLevel = req.body.node.supplierId ? true : false;
	const submitterType = topLevel ? 'Supplier' : 'Contract';
	const submitterId = topLevel ? req.body.node.supplierId : req.body.node.contractId;

	crud.create(res, 'Submission', 'id', req.body.node.id, req.body.node, [
		{name:'SUBMITS', from: `${submitterType}`, fromId: submitterId, to: 'Submission', toId: req.body.node.id},
		{name:'ANSWERS', from: 'Submission', fromId: req.body.node.id, to: 'Survey', toId: req.body.node.surveyId}
	]);

	for (let answer of req.body.answers) {
		crud.create(res, 'SubmissionAnswer', 'id', answer.id, answer, [
			{name:'HAS', from: 'Submission', fromId: req.body.node.id, toId: answer.id, to: 'SubmissionAnswer'},
			{name:'ANSWERS_QUESTION', from: 'SubmissionAnswer', fromId: answer.id, toId: answer.id, to: 'SurveyQuestion'}
		]);
	}
};

const getAllforOne = async (req, res) => {
	console.log('[SUBMISSION] getAllforOne');

	try {

		const topLevel = req.params.topLevel === 'true';
		const surveyId = req.params.surveyId;

		const submitterId = req.params.contractOrSupplierId;
		const submitterType = topLevel ? 'Supplier' : 'Contract';

		const query = `MATCH p=(${submitterType} {id: "${submitterId}"})-[r:SUBMITS]->(Submission {surveyId: "${surveyId}"})-[y:HAS]->(SubmissionAnswer)-[z:ANSWERS_QUESTION]->(x: SurveyQuestion) RETURN p ORDER BY x.id`;
		console.log('[SUBMISSION]', query);
		const result = await db.run(query);

		let submissionObj = {};

		if (result.records.length) {
			for (const record of result.records) {
				for (const field of record._fields) {
					let submission;
					let submissionAnswer;
					let surveyQuestion;

					for (const segment of field.segments) {

						switch(segment.relationship.type) {
							case 'SUBMITS':
								submission = submission || segment.end.properties;
								submissionObj.status = submission.status;
								submissionObj.id = submission.id;
							break;
							case 'HAS':
								submissionAnswer = submissionAnswer || segment.end.properties;

								if (!submissionObj[submissionAnswer.id]) {
									submissionObj[submissionAnswer.id] = {
										answer: submissionAnswer.value,
									};
								}
								else {
									submissionObj[submissionAnswer.id].answer = submissionAnswer.value;
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
			return res.status(404).end(`No ${surveyId} survey answers found for ${submitterType} ${submitterId}`);
		}
	}
	catch (e) {
		console.log('error', e);
		return res.status(500).end(e.toString());
	}
};

module.exports = { getAllforOne, create };
