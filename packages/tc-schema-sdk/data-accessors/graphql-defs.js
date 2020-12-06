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

const maybePaginate = ({ hasMany, isRelationship }) =>
	hasMany && isRelationship ? '(first: Int, offset: Int)' : '';

const maybeDirective = def => {
	if (def.cypher) {
		return `@cypher(statement: "${def.cypher
			.replace(/"/g, '\\"')
			.split(/\n/)
			.join('\\n')}")`;
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
	description = '',
	name = '',
	pagination = '',
	type = '',
	directive = '',
	deprecation = '',
}) =>
	printDescribedBlock(
		description,
		`${name}${pagination}: ${type} ${directive} ${deprecation}`,
	);

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

/*
	Outputting Query definitions
*/

const getIdentifyingFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canIdentify);

const getFilteringFields = config =>
	Object.entries(config.properties).filter(
		([, { relationship, cypher }]) => !relationship && !cypher,
	);

const paginationConfig = [
	{
		name: 'offset',
		type: 'Int = 0',
		description: 'The pagination offset to use',
	},
	{
		name: 'first',
		type: 'Int = 20000',
		description:
			'The number of records to return after the pagination offset. This uses the default neo4j ordering',
	},
];

const printPaginationDefinition = paginate =>
	paginate
		? indentMultiline(
				paginationConfig.map(printPropertyDefinition).join('\n'),
				4,
				true,
		  )
		: '';

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

const STATIC_DEFINITIONS = stripIndent`
		directive @deprecated(
		  reason: String = "No longer supported"
		) on FIELD_DEFINITION | ENUM_VALUE | ARGUMENT_DEFINITION

		scalar DateTime
		scalar Date
		scalar Time
	`;

class GraphqlDefGenerator {
	constructor(sdk) {
		this.sdk = sdk;
		this.printTypeDefinition = this.printTypeDefinition.bind(this);
		this.printRichRelationshipPropertyDefinitions = this.printRichRelationshipPropertyDefinitions.bind(
			this,
		);
		this.buildRichRelationshipPropertyModel = this.buildRichRelationshipPropertyModel.bind(
			this,
		);
		this.printRelationshipTypeDefinition = this.printRelationshipTypeDefinition.bind(
			this,
		);
	}

	generate() {
		return [].concat(
			STATIC_DEFINITIONS,
			this.getTypeDefinitions(),
			this.getRelationshipTypeDefinitions(),
			this.getQueryDefinition(),
			this.getEnumDefinitions(),
		);
	}

	getTypeDefinitions() {
		return this.sdk
			.getTypes({
				includeMetaFields: true,
			})
			.map(this.printTypeDefinition);
	}

	getRelationshipTypeDefinitions() {
		const relationshipTypes = this.sdk
			.getRelationshipTypes({
				includeMetaFields: true,
				excludeCypherRelationships: true,
			})
			.flatMap(buildRelationshipTypeModel);

		return uniqBy(relationshipTypes, ({ typeName }) => typeName).map(
			this.printRelationshipTypeDefinition,
		);
	}

	printRelationshipTypeDefinition({
		from,
		to,
		typeName,
		relationship,
		properties,
	}) {
		let propStr = '';
		if (Object.keys(properties).length) {
			propStr = indentMultiline(
				this.printPropertyDefinitions(properties),
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
	}

	getQueryDefinition() {
		const types = this.sdk.getTypes({
			includeMetaFields: true,
		});
		return [
			'type Query {\n',
			...types.map(config =>
				[
					this.printQueryDefinition({
						name: config.name,
						type: config.name,
						description: config.description,
						properties: getIdentifyingFields(config),
					}),
					this.printQueryDefinition({
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
	}

	printQueryDefinition({ name, type, description, properties, paginate }) {
		return printDescribedBlock(
			description,
			`${name}(
		${printPaginationDefinition(paginate)}
		${indentMultiline(this.printPropertyDefinitions(properties), 4, true)}
	): ${type}`,
		);
	}

	getEnumDefinitions() {
		return Object.entries(this.sdk.getEnums({ withMeta: true })).map(
			printEnumDefinition,
		);
	}

	/*
		Outputting types
	*/
	printTypeDefinition({ name, description, properties }) {
		return printDescribedBlock(
			description,
			stripEmptyFirstLine`

type ${name} {
	${indentMultiline(this.printPropertyDefinitions(properties), 2, true)}
	${indentMultiline(
		this.printRichRelationshipPropertyDefinitions(properties, name),
		2,
		true,
	)}
}`,
		);
	}

	printRichRelationshipPropertyDefinitions(properties, rootType) {
		return Object.entries(properties)
			.filter(([, { relationship }]) => relationship)
			.map(([propName, def]) =>
				this.buildRichRelationshipPropertyModel(
					propName,
					def,
					rootType,
				),
			)
			.map(printPropertyDefinition)
			.join('');
	}

	buildRichRelationshipPropertyModel(propName, def, rootType) {
		return {
			description: stripEmptyFirstLine`
		${def.description}
		*NOTE: This gives access to properties on the relationships between records
		as well as on the records themselves. Use '${propName}' instead if you do not need this*`,
			name: `${propName}_rel`,
			pagination: maybePaginate(def),
			type: getRichRelationshipPropertyType({
				hasMany: def.hasMany,
				...flattenRelationshipType(
					this.sdk.getRelationshipType(rootType, propName),
				),
			}),
			deprecation: maybeDeprecate(def),
			directive:
				rootType === def.type
					? `@relation(direction: "${
							def.direction === 'outgoing' ? 'OUT' : 'IN'
					  }")`
					: '',
		};
	}

	printPropertyDefinitions(properties) {
		if (!Array.isArray(properties)) {
			properties = Object.entries(properties);
		}

		return properties
			.map(([name, def]) => ({
				description: def.description,
				name,
				pagination: maybePaginate(def),
				type: maybePluralType({
					...def,
					type: this.getGraphqlType(def.type),
				}),
				directive: maybeDirective(def),
				deprecation: maybeDeprecate(def),
			}))
			.map(printPropertyDefinition)
			.join('\n');
	}

	getGraphqlType(type) {
		return this.sdk.getPrimitiveTypes()[type] || type;
	}
}

module.exports = {
	accessor() {
		return new GraphqlDefGenerator(this).generate();
	},
};
