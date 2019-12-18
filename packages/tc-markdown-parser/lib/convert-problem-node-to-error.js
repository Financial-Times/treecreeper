module.exports = function convertProblemNodeToErrorMessage(node) {
	const {
		message,
		position: {
			start: { line },
		},
	} = node;

	return {
		message,
		line,
	};
};
