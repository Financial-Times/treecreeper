const os = require('os');
const visit = require('unist-util-visit-parents');
const { selectAll } = require('unist-util-select');
const renderSubdocument = require('../render-subdocument');
const convertProblemToError = require('../convert-problem-node-to-error');

const stringifyJson = jsonable => JSON.stringify(jsonable, null, '\t') + os.EOL;

module.exports = function stringifyBoast({
	nameNodeTypeName = 'name',
	descriptionNodeTypeName = 'description',
}) {
	this.Compiler = function compiler(root) {
		const data = {};

		visit(root, nameNodeTypeName, node => {
			data[nameNodeTypeName] = node.value;
		});

		visit(root, descriptionNodeTypeName, node => {
			data[descriptionNodeTypeName] = renderSubdocument(node.children[0]);
		});

		visit(root, 'property', node => {
			data[node.key] = node.value;
		});

		const problems = selectAll('problem', root);
		const errors = problems.map(convertProblemToError);

		return stringifyJson({ data, errors });
	};
};
