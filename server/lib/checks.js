const nodeTypes = [
	'Contract',
	'Risk',
	'SAR',
	'Submission',
	'SubmissionAnswer',
	'Supplier',
	'Survey',
	'SurveyQuestion',
	'SurveyQuestionOption',
	'SurveySection',
];
const checkNodeType = (req, res, next) => {

	console.log('CHECK');

	const nodeType = req.params.nodeType;
	const relationship = req.body.relationship;

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
