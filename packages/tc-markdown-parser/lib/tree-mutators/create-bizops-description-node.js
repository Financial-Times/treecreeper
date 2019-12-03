const { selectAll } = require('unist-util-select');
const build = require('unist-builder');
const append = require('../append-node');

module.exports = function createBizopsDescriptionNode() {
	return function transform(tree) {
		/*
		  anything at the top level that's not a name, or in a property is part
		  of the description
		*/
		const descriptionTest = ':root > :not(name, property)';
		const descriptionChildren = selectAll(descriptionTest, tree);
		if (!descriptionChildren || !descriptionChildren.length) {
			// if we have no children there's no point in carrying on
			return;
		}

		const description = build('description', {
			children: descriptionChildren,
		});

		append(description, tree);
	};
};
