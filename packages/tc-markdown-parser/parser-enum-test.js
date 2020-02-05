const schema = require('@financial-times/tc-schema-sdk');

schema.init();
const { getParser } = require('.');

const parser = getParser({
	type: 'MainType',
});

global.doIt = async () => {
	try {
		debugger;
		const res = await parser.parseMarkdownString(`# name

## curious child

child-code
	someEnum: first
	`);
		console.log(res);
		global.doIt();
	} catch (e) {
		console.log(e);
	}
};

global.doIt();
