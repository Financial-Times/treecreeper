const unified = require('unified');
const remarkStringify = require('remark-stringify');
const remarkBehead = require('remark-behead');
const build = require('unist-builder');

const reduceSubdocumentHeadings = remarkBehead({ depth: -2 });

// TODO: do not mutate the subdoc
module.exports = function renderSubdocument(node, coerceToRoot = true) {
	reduceSubdocumentHeadings(node);
	const subdocument = coerceToRoot
		? build('root', {
				children: node.children,
		  })
		: node;

	return unified()
		.use(remarkStringify, {
			bullet: '*',
			fences: true,
		})
		.stringify(subdocument)
		.trim();
};
