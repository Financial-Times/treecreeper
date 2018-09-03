const { stripIndent } = require('common-tags');
const getTypes = require('../methods/get-types').method;
const getEnums = require('../methods/get-enums').method;

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

const graphqlDirection = direction => (direction === 'outgoing' ? 'OUT' : 'IN');

const relFragment = (type, direction, depth = '') => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[:${type}${depth}]-${right}`;
};

const maybePluralType = def => (def.hasMany ? `[${def.type}]` : def.type);

const maybePaginate = def =>
	def.isRelationship && def.hasMany ? '(first: Int, offset: Int)' : '';

const cypherResolver = def => {
	if (!def.isRelationship) {
		return '';
	}
	if (def.isRecursive) {
		return `@cypher(
      statement: "MATCH (this)${relFragment(
				def.neo4jName,
				def.direction,
				'*1..20'
			)}(related:${def.type}) RETURN DISTINCT related"
    )`;
	} else {
		return `@relation(name: "${def.neo4jName}", direction: "${graphqlDirection(
			def.direction
		)}")`;
	}
};

const generatePropertyFields = properties => {
	return properties
		.map(
			([name, def]) =>
				stripEmptyFirstLine`
      # ${def.description}
      ${name}${maybePaginate(def)}: ${maybePluralType(def)} ${cypherResolver(
					def
				)}`
		)
		.join('');
};

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

const generateGraphqlDefs = () => {
	const typeDefinitions = getTypes({ relationshipStructure: 'graphql' }).map(
		config => {
			return `
# ${config.description}
type ${config.name} {
  ${indentMultiline(
		generatePropertyFields(Object.entries(config.properties)),
		2,
		true
	)}
}`;
		}
	);

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

	const enumDefinitions = Object.entries(getEnums({ withMeta: true })).map(
		([name, { description, options }]) => {
			return `
# ${description}
enum ${name} {
${indentMultiline(Object.keys(options).join('\n'), 2)}
}`;
		}
	);

	return typeDefinitions.concat([queryDefinitions], enumDefinitions, [
		customGraphql
	]);
};

module.exports = generateGraphqlDefs;
