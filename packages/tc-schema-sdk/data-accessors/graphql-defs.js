const stripIndent = require('common-tags/lib/stripIndent');
const uniqBy = require('lodash.uniqby');

const stripEmptyFirstLine = (hardCoded, ...vars) => {
	hardCoded = [...hardCoded];
	hardCoded[0] = hardCoded[0].replace(/^\n+(.*)$/, ($0, $1) => $1);
	return [...new Array(Math.max(hardCoded.length, vars.length))]
		.map((val, i) => `${hardCoded[i] || ''}${vars[i] || ''}`)
		.join('');
};

const indentMultiline = (str, indent, trimFirst) => {
	indent = [...new Array(indent)].map(() => ' ').join('');
	return str
		.split('\n')
		.map(line => {
			line = trimFirst ? line.trim() : line;
			return `${line.length ? indent : ''}${line}`;
		})
		.join('\n');
};

const printDescribedBlock = (description, content) => stripEmptyFirstLine`
"""
${description}
"""
${content}
`;

/*
	Outputting property definitions
*/

const maybePluralType = ({ type, hasMany }) => (hasMany ? `[${type}]` : type);

const maybePaginate = ({ hasMany }) =>
	hasMany ? '(first: Int, offset: Int)' : '';

const maybeDirective = def => {
	if (def.cypher) {
		return `@cypher(statement: "${def.cypher}")`;
	}
	if (def.relationship) {
		return `@relation(name: "${def.relationship}", direction: "${
			def.direction === 'outgoing' ? 'OUT' : 'IN'
		}")`;
	}

	return '';
};

const maybeDeprecate = ({ deprecationReason }) => {
	if (deprecationReason) {
		return `@deprecated(reason: "${deprecationReason.replace(
			/"/g,
			'\\"',
		)}")`;
	}
	return '';
};

const printPropertyDefinition = ({
	description,
	name,
	pagination,
	type,
	directive,
	deprecation,
}) =>
	printDescribedBlock(
		description,
		`${name}${pagination}: ${type} ${directive} ${deprecation}`,
	);

const buildPropertyModel = ([name, def]) => ({
	description: def.description,
	name,
	pagination: maybePaginate(def),
	type: maybePluralType(def),
	directive: maybeDirective(def),
	deprecation: maybeDeprecate(def),
});

const printPropertyDefinitions = properties => {
	if (!Array.isArray(properties)) {
		properties = Object.entries(properties);
	}
	return properties
		.map(buildPropertyModel)
		.map(printPropertyDefinition)
		.join('\n');
};

/*
	Outputting rich relationships
*/

const snakeToCamel = str => {
	const camel = str
		.split('_')
		.map(
			word =>
				word.charAt(0).toUpperCase() + word.substring(1).toLowerCase(),
		)
		.join('');
	return camel;
};

const getRichRelationshipTypeName = (from, relationship, to) =>
	snakeToCamel(`${from.toUpperCase()}_${relationship}_${to.toUpperCase()}`);

const getRichRelationshipPropertyType = ({
	from,
	to,
	relationship,
	hasMany,
}) => {
	return maybePluralType({
		type: getRichRelationshipTypeName(from, relationship, to),
		hasMany,
	});
};

const flattenRelationshipType = ({ from, to, relationship }) => ({
	relationship,
	from: from.type,
	to: to.type,
});

const buildRelationshipTypeModel = relationshipType => {
	const { from, relationship, to } = flattenRelationshipType(
		relationshipType,
	);
	return {
		typeName: getRichRelationshipTypeName(from, relationship, to),
		...relationshipType,
	};
};

const buildRichRelationshipPropertyModel = (
	propName,
	def,
	rootType,
	getRelationshipType,
) => ({
	description: stripEmptyFirstLine`
		${def.description}
		*NOTE: This gives access to properties on the relationships between records
		as well as on the records themselves. Use '${propName}' instead if you do not need this*`,
	name: `${propName}_rel`,
	pagination: maybePaginate(def),
	type: getRichRelationshipPropertyType({
		hasMany: def.hasMany,
		...flattenRelationshipType(getRelationshipType(rootType, propName)),
	}),
	deprecation: maybeDeprecate(def),
	directive:
		rootType === def.type
			? `@relation(direction: "${
					def.direction === 'outgoing' ? 'OUT' : 'IN'
			  }")`
			: '',
});

const printRichRelationshipPropertyDefinitions = (
	properties,
	rootType,
	getRelationshipType,
) =>
	Object.entries(properties)
		.filter(([, { relationship }]) => relationship)
		.map(([propName, def]) =>
			buildRichRelationshipPropertyModel(
				propName,
				def,
				rootType,
				getRelationshipType,
			),
		)
		.map(printPropertyDefinition)
		.join('');

const printRelationshipTypeDefinition = ({
	from,
	to,
	typeName,
	relationship,
	properties,
}) => {
	let propStr = '';
	if (Object.keys(properties).length) {
		propStr = indentMultiline(
			printPropertyDefinitions(properties),
			4,
			true,
		);
	}
	return printDescribedBlock(
		'Internal use only',
		stripIndent`
	type ${typeName} @relation(name: "${relationship}") {
		from: ${from.type}
		to: ${to.type}
		${propStr}
	}`,
	);
};

const printRelationshipTypeDefinitions = relationships =>
	uniqBy(
		[].concat(...relationships.map(buildRelationshipTypeModel)),
		({ typeName }) => typeName,
	).map(printRelationshipTypeDefinition);
/*
	Outputting Query definitions
*/

const getIdentifyingFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canIdentify);

const getFilteringFields = config =>
	Object.entries(config.properties).filter(
		([, { relationship, cypher }]) => !relationship && !cypher,
	);

const paginationConfig = {
	offset: {
		type: 'Int = 0',
		description: 'The pagination offset to use',
	},
	first: {
		type: 'Int = 20000',
		description:
			'The number of records to return after the pagination offset. This uses the default neo4j ordering',
	},
};

const printPaginationDefinition = paginate =>
	paginate
		? indentMultiline(printPropertyDefinitions(paginationConfig), 4, true)
		: '';

const printQueryDefinition = ({
	name,
	type,
	description,
	properties,
	paginate,
}) => {
	return printDescribedBlock(
		description,
		`${name}(
		${printPaginationDefinition(paginate)}
		${indentMultiline(printPropertyDefinitions(properties), 4, true)}
	): ${type}`,
	);
};

const printQueryDefinitions = types => [
	'type Query {\n',
	...types.map(config =>
		[
			printQueryDefinition({
				name: config.name,
				type: config.name,
				description: config.description,
				properties: getIdentifyingFields(config),
			}),
			printQueryDefinition({
				name: config.pluralName,
				type: `[${config.name}]`,
				description: config.description,
				properties: getFilteringFields(config),
				paginate: true,
			}),
		].join('\n'),
	),
	'}',
];

/*
	Outputting types
*/

const printTypeDefinition = getRelationshipType => ({
	name,
	description,
	properties,
}) =>
	printDescribedBlock(
		description,
		stripEmptyFirstLine`
type ${name} {
	${indentMultiline(printPropertyDefinitions(properties), 2, true)}
	${indentMultiline(
		printRichRelationshipPropertyDefinitions(
			properties,
			name,
			getRelationshipType,
		),
		2,
		true,
	)}
}`,
	);

const printEnumOptionDefinition = ({ value, description }) =>
	description ? printDescribedBlock(description, value) : value;

const printEnumDefinition = ([name, { description, options }]) => {
	const enums = Object.values(options).map(printEnumOptionDefinition);

	return printDescribedBlock(
		description,
		`enum ${name} {
${indentMultiline(enums.join('\n'), 2)}
}`,
	);
};

module.exports = {
	accessor() {
		const retrieveOptions = {
			primitiveTypes: 'graphql',
			includeMetaFields: true,
		};

		const types = this.getTypes(retrieveOptions);
		const enums = this.getEnums({ withMeta: true });

		const staticTypeDefinitions = stripIndent`
		directive @deprecated(
		  reason: String = "No longer supported"
		) on FIELD_DEFINITION | ENUM_VALUE | ARGUMENT_DEFINITION

		scalar DateTime
		scalar Date
		scalar Time
	`;
		const typeDefinitions = types.map(
			printTypeDefinition(this.getRelationshipType),
		);
		const relationshipTypeDefinitions = printRelationshipTypeDefinitions(
			this.getRelationshipTypes({
				...retrieveOptions,
				excludeCypherRelationships: true,
			}),
		);

		const enumDefinitions = Object.entries(enums).map(printEnumDefinition);

		const queryDefinition = printQueryDefinitions(
			types.filter(({ from, to }) => !from && !to),
		);

		return [].concat(
			staticTypeDefinitions,
			typeDefinitions,
			relationshipTypeDefinitions,
			queryDefinition,
			enumDefinitions,
		);
	},
};
