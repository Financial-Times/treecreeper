const nodeTypes = ['supplier', 'contract', 'response', 'risk', 'survey'];

const checkNodeType = (req, res, next) => {

	const nodeType = req.params.nodeType;
	const relationship = req.body.relationship;

	if (!nodeType ||
		relationship && !relationship.targetNode ||
		relationship && relationship.targetNode && !relationship.targetNode.type) {
		return res.status(400).end();
	}

	if (nodeTypes.includes(nodeType.toLowerCase())) {
		res.locals.nodeType = nodeType.toLowerCase();

		if (relationship && nodeTypes.includes(relationship.targetNode.type)){
			res.locals.targetNodeType = relationship.targetNode.type.toLowerCase();
			return next();
		}
		else {
			return res.status(400).end(`Node type "${relationship.targetNode.type}" in relationship not allowed`);
		}

		return next();
	}
	else {
		return res.status(400).end(`Node type "${nodeType}" not allowed`);
	}
};

module.exports = { checkNodeType, nodeTypes };
