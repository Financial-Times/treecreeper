const unified = require('unified');
const remarkParse = require('remark-parse');
// const schema = require('@financial-times/biz-ops-schema');
const { readFileSync } = require('fs');
const { selectAll } = require('unist-util-select');

// schema.configure({
// 	baseUrl: process.env.SCHEMA_BASE_URL,
// 	updateMode: 'stale',
// 	logger: console,
// });
//
// const parser = runbookMd(schema);
const dump = obj => {
	console.log(JSON.stringify(obj, null, '  '));
};

function someOriginalTransformer() {
	return function transform(tree) {
		console.log(tree);
		const headings = selectAll('heading[depth=1]', tree);
		dump(headings);
	};
}

(async () => {
	const mdString = readFileSync('../../RUNBOOK.md', 'utf8');
	// const { data, errors } = await parser.parseRunbookString(mdString);
	// console.log(data, errors);
	const processor = await unified()
		.use(remarkParse)
		.use(someOriginalTransformer)();

	const parsed = await processor.parse(mdString);
	await processor.runSync(parsed);
	//console.log(JSON.stringify(tree, null, '  '));
})();
