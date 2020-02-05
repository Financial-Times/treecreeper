const remarkParse = require('remark-parse');
const createStream = require('unified-stream');
const unified = require('unified');
const schema = require('@financial-times/tc-schema-sdk');
const createTreecreeperTitleNode = require('./tree-mutators/create-treecreeper-title-node');
const createTreecreeperDescriptionNode = require('./tree-mutators/create-treecreeper-description-node');
const createTreecreeperPropertyNodes = require('./tree-mutators/create-treecreeper-property-nodes');
const setTreecreeperPropertyNames = require('./tree-mutators/set-treecreeper-property-names');
const coerceTreecreeperPropertiesToType = require('./tree-mutators/coerce-treecreeper-properties-to-type');
const validateTreecreeperProperties = require('./tree-mutators/validate-treecreeper-properties');
const stringifyBoast = require('./unist-stringifiers/stringify-boast');
const setNestedMultilineProperties = require('./tree-mutators/set-nested-multiline-properties');

/* @param schema: Treecreeper schema singleton */
const unifiedProcessor = function({
	type,
	titleFieldName = 'name',
	descriptionFieldName = 'description',
	blacklistPropertyNames = [],
}) {
	return async () => {
		await schema.ready();

		const types = schema.getTypes();
		const { properties } = schema.getType(type);
		const typeNames = new Set(types.map(({ name }) => name));

		const validateProperty = (key, value) => {
			return schema.validators.validateProperty(type, key, value);
		};

		return unified()
			.use(remarkParse)
			.use(createTreecreeperTitleNode, {
				titleFieldName,
			})
			.use(createTreecreeperPropertyNodes)
			.use(createTreecreeperDescriptionNode, {
				descriptionFieldName,
			})
			.use(setTreecreeperPropertyNames, {
				properties,
			})
			.use(setNestedMultilineProperties, {
				typeNames,
				properties,
				rootType: type,
			})
			.use(coerceTreecreeperPropertiesToType, {
				properties,
				typeNames,
				primitiveTypesMap: schema.getPrimitiveTypes({
					output: 'graphql',
				}),
				enums: schema.getEnums(),
			})
			.use(validateTreecreeperProperties, {
				validateProperty,
				propertyNameBlacklist: blacklistPropertyNames,
			})
			.use(stringifyBoast, {
				titleFieldName,
				descriptionFieldName,
			});
	};
};

const getParser = ({
	type,
	titleFieldName = 'name',
	descriptionFieldName = 'description',
	blacklistPropertyNames = [],
} = {}) => {
	const markdownParser = unifiedProcessor({
		type,
		titleFieldName,
		descriptionFieldName,
		blacklistPropertyNames,
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
