const db = require('../db-connection');
const util = require('util');

const stringify = (object) => util.inspect(object, { showHidden: false, depth: null, colors: false, breakLength: Infinity });

const addAnswerToQuery = (query, answer, index) => {
	query += ` WITH submission 
			MERGE (answer${index}:SubmissionAnswer {id: '${answer.id}'})
				SET answer${index} += ${stringify(answer)}
				WITH submission, answer${index}
			MATCH (question${index}:SurveyQuestion {id : '${answer.questionId}'})
			MERGE (submission)-[:HAS]->(answer${index})-[:ANSWERS_QUESTION]->(question${index})`;
	return query;
};

const submit = async (req, res) => {
	const initialQuery = `MATCH (submission:Submission {id: '${req.body.node.id}'})
								SET submission += ${stringify(req.body.node)}`;
	const submissionQuery = req.body.answers? req.body.answers.reduce(addAnswerToQuery, initialQuery) : initialQuery;
	console.log('[SUBMISSION] submitQuery', submissionQuery);
	try{
		const result = await db.run(submissionQuery);
		res.send(result);
	}
	catch(e){
		console.log('error', e);
		return res.status(500).end(e.toString());
	}
};

const getAllforOne = async (req, res) => {
	console.log('[SUBMISSION] getAllforOne');

	try {

		const topLevel = req.params.topLevel === 'true';
		const surveyId = req.params.surveyId;

		const submitterId = req.params.contractOrSupplierId;
		const submitterType = topLevel ? 'Supplier' : 'Contract';

		// TODO replace this while thing with _cypher-to-json.js
		const query = `MATCH submissions=(${submitterType} {id: "${submitterId}"})-[r:SUBMITS]->(Submission {surveyId: "${surveyId}"}) 
		OPTIONAL MATCH answers=(Submission)-[y:HAS]->(SubmissionAnswer)-[z:ANSWERS_QUESTION]->(x:SurveyQuestion) 
		RETURN submissions, collect(answers)`;
		
		console.log('[SUBMISSION]', query);
		const result = await db.run(query);

		let submissionObj = {};

		if (result.records.length) {
			for (const record of result.records) {
				let submissionAnswer;
				let surveyQuestion;
				
				const [ submissions, answers ] = record._fields;
				const submission = submissions.segments.find((segment) => segment.relationship.type === 'SUBMITS');
				
				submissionObj.status = submission.end.properties.status;
				submissionObj.id = submission.end.properties.id;
				for (const field of answers) {
					for (const segment of field.segments) {
						switch(segment.relationship.type) {
							case 'HAS':
								submissionAnswer = segment.end.properties;
								if (!submissionObj[submissionAnswer.questionId]) {
									submissionObj[submissionAnswer.questionId] = {
										answer: submissionAnswer.value,
									};
								}
								else {
									submissionObj[submissionAnswer.questionId].answer = submissionAnswer.value;
								}
							break;
							case 'ANSWERS_QUESTION':
								surveyQuestion = segment.end.properties;

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

module.exports = { getAllforOne, submit};
