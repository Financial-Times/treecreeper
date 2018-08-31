const { stripIndent } = require('common-tags');

// Just here to ensure 100% backwards compatibility with previous beginnings
// of graphql mutations
const customGraphql = `
input SystemInput {
    serviceTier: ServiceTier
    name: String
    supported: Boolean
    primaryURL: String
    systemType: String
    serviceTier: ServiceTier
    serviceType: String
    hostPlatform: String
    personalData: Boolean
    sensitiveData: Boolean
    lifecycleStage: SystemLifecycle
}

type Mutation {
    System(code: String, params: SystemInput): System!
}`;

const stripEmptyFirstLine = (hardCoded, ...vars) => {
	hardCoded[0] = hardCoded[0].replace(/^\n+(.*)$/, ($0, $1) => $1);
	return [...Array(Math.max(hardCoded.length, vars.length))]
		.map((val, i) => `${hardCoded[i] || ''}${vars[i] || ''}`)
		.join('');
};

const indentMultiline = (str, indent, trimFirst) => {
	indent = [...Array(indent)].map(() => ' ').join('');
	return str
		.split('\n')
		.map(line => {
			line = trimFirst ? line.trim() : line;
			return `${line.length ? indent : ''}${line}`;
		})
		.join('\n');
};

const generatePropertyFields = properties => {
	return properties
		.map(([key, value]) => {
			return stripEmptyFirstLine`
      # ${value.description}
      ${key}: ${value.type}`;
		})
		.join('');
};

const relFragment = (type, direction, depth = '') => {
	const left = direction === 'IN' ? '<' : '';
	const right = direction === 'OUT' ? '>' : '';
	return `${left}-[:${type}${depth}]-${right}`;
};

const maybePluralType = definition =>
	definition.hasMany ? `[${definition.type}]` : definition.type;

const maybePaginate = definition =>
	definition.hasMany ? '(first: Int, offset: Int)' : '';

const generateDirectRelationshipField = definition =>
	definition.description && definition.name
		? `# ${definition.description}
        ${definition.name}${maybePaginate(definition)}: ${maybePluralType(
				definition
		  )} @relation(name: "${definition.underlyingRelationship}", direction: "${
				definition.direction
		  }")`
		: '';

const generateRecursiveRelationshipField = definition =>
	definition.recursiveDescription && definition.recursiveName
		? `# ${definition.recursiveDescription}
        ${definition.recursiveName}${maybePaginate(
				definition
		  )}: ${maybePluralType(definition)} @cypher(
      statement: "MATCH (this)${relFragment(
				definition.underlyingRelationship,
				definition.direction,
				'*1..20'
			)}(related:${definition.type}) RETURN DISTINCT related"
    )`
		: '';

const generateRelationshipField = definition => {
	return stripEmptyFirstLine`
        ${generateDirectRelationshipField(definition)}
        ${generateRecursiveRelationshipField(definition)}`;
};

const generateRelationshipFields = definitions =>
	(definitions || []).map(generateRelationshipField).join('');

const PAGINATE = indentMultiline(
	generatePropertyFields(
		Object.entries({
			offset: {
				type: 'Int = 0',
				description: 'The pagination offset to use'
			},
			first: {
				type: 'Int = 20000',
				description:
					'The number of records to return after the pagination offset. This uses the default neo4j ordering'
			}
		})
	),
	4,
	true
);


const getIdentifyingFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canIdentify);

const getFilteringFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canFilter);


const generateQuery = ({ name, type, properties, paginate }) => {
	return `
  ${name}(
    ${paginate ? PAGINATE : ''}
    ${indentMultiline(generatePropertyFields(properties), 4, true)}
  ): ${type}`;
};

const getTypes = require('../methods/get-types').method
const rawData = require('../lib/raw-data');

const generateGraphqlDefs = () => {
	const typeDefinitions = getTypes().map(config => {
		return `
# ${config.description}
type ${config.name} {
  ${indentMultiline(
		generatePropertyFields(Object.entries(config.properties)),
		2,
		true
	)}
}`
//   ${indentMultiline(
// 		generateRelationshipFields(relationshipsSchema[config.name]),
// 		2,
// 		true
// 	)}
// }`;
	});

	const queries = getTypes().map(config => {
		return stripIndent`
      ${generateQuery({
				name: config.name,
				type: config.name,
				properties: getIdentifyingFields(config)
			})}
      ${generateQuery({
				name: config.pluralName,
				type: `[${config.name}]`,
				properties: getFilteringFields(config),
				paginate: true
			})}`;
	});

	const queryDefinitions = stripIndent`
type Query {
  ${indentMultiline(queries.join('\n\n'), 2)}
}`;

	const enumDefinitions = Object.entries(rawData.getEnums()).map(
		([key, { description, options }]) => {
			options = Array.isArray(options) ? options : Object.keys(options);
			return `
# ${description}
enum ${key} {
${indentMultiline(options.join('\n'), 2)}
}`;
		}
	);

	return typeDefinitions.concat([queryDefinitions], enumDefinitions, [
		customGraphql
	]);
};

module.exports = generateGraphqlDefs;
