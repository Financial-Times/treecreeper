const build = require('unist-builder');
const { select } = require('unist-util-select');
const visitHeadingRanges = require('mdast-util-heading-range');
const flattenNodeToPlainString = require('../flatten-node-to-plain-string');

function mutate(start, nodes, end) {
	return [
		{
			type: 'property',
			key: flattenNodeToPlainString(start),
			position: start.position,
			children: [build('root', { children: nodes })],
		},
		end,
	];
}

function isFieldHeading(heading, node) {
	return node.depth === 2;
}

module.exports = function createBizopsPropertyNodes() {
	return function transform(tree) {
		while (select('heading[depth=2]', tree)) {
			/*
				visitHeadingRanges calls mutate with the nodes between a heading
				of a given level (in this case h2, because those are our
			 	property keys)
			*/
			visitHeadingRanges(tree, isFieldHeading, mutate);
		}
	};
};
