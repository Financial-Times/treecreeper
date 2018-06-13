const { stripIndent } = require('common-tags');

// Just here to ensure 100% backwards compatibility with previous beginnings
// of graphql mutations
const customGraphql = `
input SystemInput {
    serviceTier: ServiceTier
    name: String
    supported: YesNo
    primaryURL: String
    systemType: String
    serviceTier: ServiceTier
    serviceType: String
    hostPlatform: String
    personalData: YesNo
    sensitiveData: YesNo
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

const generateRelationshipField = definition => {
	const type = definition.hasMany ? `[${definition.type}]` : definition.type;
	return stripEmptyFirstLine`
        # ${definition.description}
        ${definition.name}: ${type} @relation(name: "${
		definition.underlyingRelationship
	}${definition.depth || ''}", direction: "${definition.direction}")`;
};

const generateRelationshipFields = definitions =>
	(definitions || []).map(generateRelationshipField).join('');

const generateQuery = ({ name, type, properties }) => {
	if (!properties.length) {
		return '';
	}

	return `
  ${name}(
    ${indentMultiline(generatePropertyFields(properties), 4, true)}
  ): ${type}`;
};

const generateGraphqlDefs = ({
	getIdentifyingFields,
	getFilteringFields,
	getPlural,
	typesSchema,
	relationshipsSchema,
	enumsSchema
}) => {
	const typeDefinitions = typesSchema.map(config => {
		return `
# ${config.description}
type ${config.name} {
  ${indentMultiline(
		generatePropertyFields(Object.entries(config.properties)),
		2,
		true
	)}
  ${indentMultiline(
		generateRelationshipFields(relationshipsSchema[config.name]),
		2,
		true
	)}
}`;
	});

	const queries = typesSchema.map(config => {
		return stripIndent`
      ${generateQuery({
				name: config.name,
				type: config.name,
				properties: getIdentifyingFields(config)
			})}
      ${generateQuery({
				name: getPlural(config),
				type: `[${config.name}]`,
				properties: getFilteringFields(config)
			})}`;
	});

	const queryDefinitions = stripIndent`
type Query {
  ${indentMultiline(queries.join('\n\n'), 2)}
}`;

	const enumDefinitions = Object.entries(enumsSchema).map(
		([key, { description, options }]) => {
			options = Array.isArray(options)
				? options.map(str => str.toUpperCase())
				: Object.keys(options);
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
