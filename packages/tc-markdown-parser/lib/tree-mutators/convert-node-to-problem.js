module.exports = function convertNodeToProblem({ node, message }) {
	node.type = 'problem';
	node.message = message;
	return node;
};
