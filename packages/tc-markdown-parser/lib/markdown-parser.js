const remarkParse = require('remark-parse');
const createStream = require('unified-stream');
const unified = require('unified');
const createTreecreeperNameNode = require('./tree-mutators/create-treecreeper-name-node');
const createTreecreeperDescriptionNode = require('./tree-mutators/create-treecreeper-description-node');
const createTreecreeperPropertyNodes = require('./tree-mutators/create-treecreeper-property-nodes');
const setTreecreeperPropertyNames = require('./tree-mutators/set-treecreeper-property-names');
const coerceTreecreeperPropertiesToType = require('./tree-mutators/coerce-treecreeper-properties-to-type');
const validateTreecreeperProperties = require('./tree-mutators/validate-treecreeper-properties');
const stringifyBoast = require('./unist-stringifiers/stringify-boast');

/* @param schema: bizOpsSchema singleton */
const unifiedProcessor = function(
	schema,
	{
		type,
		h1Property = 'name',
		firstParagraphProperty = 'description',
		// fieldWhitelist = [], FIXME: usage?
		fieldBlacklist = [],
	},
) {
	return async () => {
		await schema.ready();

		const types = schema.getTypes();
		const { properties } = types.find(({ name }) => name === type);
		const typeNames = new Set(types.map(({ name }) => name));

		const validateProperty = (key, value) => {
			return schema.validators.validateProperty(type, key, value);
		};

		return unified()
			.use(remarkParse)
			.use(createTreecreeperNameNode, {
				nameNodeTypeName: h1Property,
			})
			.use(createTreecreeperPropertyNodes)
			.use(createTreecreeperDescriptionNode, {
				descriptionNodeTypeName: firstParagraphProperty,
			})
			.use(setTreecreeperPropertyNames, {
				properties,
			})
			.use(coerceTreecreeperPropertiesToType, {
				properties,
				typeNames,
				primitiveTypesMap: schema.primitiveTypesMap,
				enums: schema.getEnums(),
			})
			.use(validateTreecreeperProperties, {
				validateProperty,
				propertyNameBlacklist: fieldBlacklist,
			})
			.use(stringifyBoast);
	};
};

const getParser = (
	schema,
	{
		type,
		h1Property = 'name',
		firstParagraphProperty = 'description',
		fieldWhitelist = [],
		fieldBlacklist = [],
	} = {},
) => {
	const markdownParser = unifiedProcessor(schema, {
		type,
		h1Property,
		firstParagraphProperty,
		fieldWhitelist,
		fieldBlacklist,
	});

	markdownParser.createStream = async function() {
		return createStream(await this());
	};

	markdownParser.parseMarkdownString = async function(markdownString) {
		const processor = await this();
		const vfile = await processor.process(markdownString);
		try {
			return JSON.parse(vfile.contents);
		} catch (error) {
			throw new Error(
				'failed when trying to JSON parse the stringified output from `runbookmd`',
			);
		}
	};

	return markdownParser;
};

module.exports = getParser;
