const { curry } = require('lodash');

const crud = require('./_crud');
const { session: db } = require('../db-connection');
const cypher = require('../lib/cypher');
const { getSignedUrl } = require('../lib/s3');

const getAllforOne = async (req, res) => {
	return crud.getAllforOne(
		res,
		{ name: 'SIGNS', from: 'Supplier', to: 'Contract' },
		req.params.supplierId
	);
};

const get = async (req, res) => {
	try {
		const { supplierId } = req.params;
		if (!supplierId) return res.status(400).end('a supplier id is required.');

		const query = `MATCH (supplier:Supplier {id: '${supplierId}'})
			OPTIONAL MATCH (supplier)-[:SUBMITS]->(topLevel:Submission)
			WITH supplier, topLevel
			OPTIONAL MATCH (topLevel)-[:HAS|:ANSWERS]->(topLevelAnswer:SubmissionAnswer)-[:ANSWERS_QUESTION]->(topLevelQuestion:SurveyQuestion)
			OPTIONAL MATCH (supplier)-[:SIGNS]->(contract:Contract)-[:SUBMITS]->(submission:Submission)
			WITH supplier, topLevel, topLevelAnswer, topLevelQuestion, contract, submission
			OPTIONAL MATCH (submission)-[:HAS|:ANSWERS]->(answer:SubmissionAnswer)-[:ANSWERS_QUESTION]->(question:SurveyQuestion)
			RETURN supplier, topLevel, topLevelAnswer, topLevelQuestion, contract, submission, question, answer ORDER BY question.id`;

		const result = await db.run(query);
		const records = cypher.res.parse(result.records);
		const [supplier] = cypher.res.uniquePropertiesByKey('supplier', records);

		const questions = cypher.res
			.uniquePropertiesByKey('question', records)
			.map(formatQuestion);

		const answers = await Promise.all(
			cypher.res
				.uniquePropertiesByKey('answer', records)
				.map(mergeQuestionsAndAnswers(questions))
				.map(await getFileUrls)
		);

		const submissions = cypher.res
			.uniquePropertiesByKey('submission', records)
			.map(addAnswersToSubmission(answers));

		const contracts = cypher.res
			.uniquePropertiesByKey('contract', records)
			.map(addSubmissionsToContract(submissions));

		const response = { contracts, supplier };

		if (!contracts.length) {
			const message = `No submissions found for ${supplierId}`;
			return res.status(404).end(message);
		}
		return res.send(response);
	} catch (err) {
		console.log('[CONTRACT]', err.toString());
		return res.status(500).end(err.toString());
	}
};

const valueToJSON = props => {
	const { key, fileName: text } = JSON.parse(props);
	return { key, text };
};
const valueToFileUrl = ({ key, text }) => {
	return getSignedUrl(key).then(link => ({ link, text }));
};

const getFileUrls = async answer => {
	if (answer.type === 'upload') {
		answer.value = await Promise.all(
			answer.value.map(valueToJSON).map(valueToFileUrl)
		);
	}
	return answer;
};
const formatQuestion = ({ fieldType, text, id }) => ({
	questionId: id,
	fieldType,
	text
});
const mergeQuestionsAndAnswers = curry((questions, answer) =>
	Object.assign(
		{},
		answer,
		questions.find(question => answer.questionId === question.questionId)
	)
);
const addAnswersToSubmission = curry((answers, submission) =>
	Object.assign(submission, {
		answers: answers.filter(
			answer =>
				answer.id.startsWith(submission.surveyId) &&
				answer.id.endsWith(submission.contractId)
		)
	})
);
const addSubmissionsToContract = curry((submissions, contract) =>
	Object.assign(contract, {
		submissions: submissions.filter(
			submission => submission.contractId === contract.id
		)
	})
);

module.exports = { get, getAllforOne };
