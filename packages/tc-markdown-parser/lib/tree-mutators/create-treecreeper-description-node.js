const { selectAll } = require('unist-util-select');
const build = require('unist-builder');
const append = require('../append-node');
const convertNodeToProblem = require('./convert-node-to-problem');

module.exports = function createBizopsDescriptionNode({
	descriptionFieldName = 'description',
}) {
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
		if (descriptionChildren.length > 1) {
			convertNodeToProblem({
				node: descriptionChildren.pop(),
				message:
					'only one description is allowed to define in top level',
			});
		}

		const description = build(descriptionFieldName, {
			children: descriptionChildren,
		});

		append(description, tree);
	};
};