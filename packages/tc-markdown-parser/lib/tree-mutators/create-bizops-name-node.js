const { selectAll } = require('unist-util-select');
const flattenNodeToPlainString = require('../flatten-node-to-plain-string');
const convertNodeToProblem = require('./convert-node-to-problem');
const createProblem = require('../create-problem');
const append = require('../append-node');

function convertToNameNode(node) {
	node.type = 'name';
	node.value = flattenNodeToPlainString(node);
	return node;
}

function convertToMultipleNameProblem(node) {
	convertNodeToProblem({
		node,
		message: 'There should only be one name heading (h1)',
	});
}

function convertToInlineMarkdownProblem(node) {
	convertNodeToProblem({
		node,
		message:
			'Inline markdown is invalid in a name (i.e. **bold**, _italic_ or links)',
	});
}

function appendNoNameProblem(tree) {
	const problem = createProblem({
		message: 'There has to be a name heading (h1)',
	});

	append(problem, tree);
}

module.exports = function createBizopsNameNode() {
	return function transform(tree) {
		const headings = selectAll('heading[depth=1]', tree);
		switch (headings.length) {
			case 1: {
				const [heading] = headings;
				if (heading.children.length > 1) {
					convertToInlineMarkdownProblem(heading);
					return;
				}
				convertToNameNode(heading);
				return;
			}
			case 0: {
				appendNoNameProblem(tree);
				return;
			}
			case 2:
			default: {
				headings.forEach(convertToMultipleNameProblem);
			}
		}
	};
};
