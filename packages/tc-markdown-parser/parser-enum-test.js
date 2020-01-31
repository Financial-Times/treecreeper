const schema = require('@financial-times/tc-schema-sdk')
schema.init();
const {getParser} = require('./index')

const parser = getParser({
	type: 'ChildType',
})

parser.parseMarkdownString(`# name

	## curious child

	child-code
		someEnum: first
`);

