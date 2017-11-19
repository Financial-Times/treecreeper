const nodeTypes = ['Supplier', 'Contract', 'Submission', 'Risk', 'Survey', 'SurveySection', 'SurveyQuestion', 'SurveyQuestionOption', 'SubmissionAnswer'];
// const nodeTypes = ['supplier', 'contract', 'response', 'risk', 'survey', 'survey_section', 'survey_question', 'survey_question_option', 'submission_answer', 'submission'];
const checkNodeType = (req, res, next) => {

	console.log('CHECK');

	const nodeType = req.params.nodeType;
	const relationship = req.body.relationship;

	// console.log(nodeType)
	// console.log(relationship)
	// console.log(relationship && !relationship.targetNode)

	if (!nodeType ||
		relationship && !relationship.targetNode ||
		relationship && relationship.targetNode && !relationship.targetNode.type) {
		return res.status(400).end();
	}

	if (nodeTypes.includes(nodeType.toLowerCase())) {
		res.locals.nodeType = nodeType.toLowerCase();

		if (relationship) {
			if (nodeTypes.includes(relationship.targetNode.type)){
				res.locals.targetNodeType = relationship.targetNode.type.toLowerCase();
				return next();
			}
			else {
				return res.status(400).end('Node type in relationship not allowed', relationship);
			}
		}

		return next();
	}
	else {
		return res.status(400).end(`Node type "${nodeType}" not allowed`);
	}
};

module.exports = { checkNodeType, nodeTypes };
