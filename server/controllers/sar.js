const crud = require('./_crud');

const create = async (req, res) => {

	console.log('SAR', req.body.sar);

	crud.create(res, 'SAR', 'id', req.body.sar.id, req.body.sar);

	// for (let answer of req.body.answers) {
	// 	crud.create(res, 'SubmissionAnswer', 'id', answer.id, answer, [
	// 		{name:'HAS', from: 'Submission', fromUniqueAttrName: 'id', fromUniqueAttrValue: req.body.node.id, toUniqueAttrName: 'id', toUniqueAttrValue: answer.id, to: 'SubmissionAnswer'},
	// 		{name:'ANSWERS_QUESTION', from: 'SubmissionAnswer', fromUniqueAttrName: 'id', fromUniqueAttrValue: answer.id, toUniqueAttrName: 'id', toUniqueAttrValue: answer.questionId, to: 'SurveyQuestion'}
	//
	// 	]);
	// }
};

module.exports = { create };
