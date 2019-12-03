const os = require('os');
const visit = require('unist-util-visit-parents');
const { selectAll } = require('unist-util-select');
const renderSubdocument = require('../render-subdocument');
const convertProblemToError = require('../convert-problem-node-to-error');

const stringifyJson = jsonable => JSON.stringify(jsonable, null, '\t') + os.EOL;

module.exports = function stringifyBoast() {
	this.Compiler = function compiler(root) {
		const data = {};

		visit(root, 'name', node => {
			data.name = node.value;
		});

		visit(root, 'description', node => {
			data.description = renderSubdocument(node.children[0]);
		});

		visit(root, 'property', node => {
			data[node.key] = node.value;
		});

		const problems = selectAll('problem', root);
		const errors = problems.map(convertProblemToError);

		return stringifyJson({ data, errors });
	};
};
