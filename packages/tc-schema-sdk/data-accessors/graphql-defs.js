const stripIndent = require('common-tags/lib/stripIndent');
const uniqBy = require('lodash.uniqby');

const stripEmptyFirstLine = (hardCoded, ...vars) => {
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
		return `@relation(name: "${def.relationship}", direction: "${def.direction}")`;
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

const getRelationship = (relType, name) => {
	const { from = {}, to = {}, relationship } = relType;
	let type;
	let hasMany;
	let direction;

	if (from.type === name) {
		type = from.type || to.type;
		hasMany = !!from.hasMany;
		direction = 'IN';
	} else {
		type = to.type || from.type;
		hasMany = !!to.hasMany;
		direction = 'OUT';
	}
	return {
		type,
		hasMany,
		direction,
		relationship,
	};
};

const printRichRelationshipModel = (types, name, [propName, def]) => {
	const relType = types.find(type => type.name === def.type);
	if (!relType) {
		return;
	}
	const { type, relationship, hasMany, direction } = getRelationship(
		relType,
		name,
	);

	return {
		description: def.description,
		name: propName,
		pagination: maybePaginate({ hasMany }),
		type: maybePluralType({ type, hasMany }),
		directive: maybeDirective({ direction, relationship }),
		deprecation: maybeDeprecate(def),
	};
};

const buildPropertyModel = ([name, def]) => ({
	description: def.description,
	name,
	pagination: maybePaginate(def),
	type: maybePluralType(def),
	directive: maybeDirective(def),
	deprecation: maybeDeprecate(def),
});

const printPropertyDefinitions = (types, name, properties) => {
	if (!Array.isArray(properties)) {
		properties = Object.entries(properties);
	}
	return properties
		.map(
			prop =>
				printRichRelationshipModel(types, name, prop) ||
				buildPropertyModel(prop),
		)
		.map(printPropertyDefinition)
		.join('\n');
};

/*
	Outputting rich relationships
*/

const buildRelationshipTypeModel = ({
	from = {},
	to = {},
	relationship,
	name,
	properties = {},
}) => ({
	from: from.type || to.type,
	to: to.type || from.type,
	relationship,
	name,
	properties,
});

const buildRichRelationshipPropertyModel = (types, name) => ([
	propName,
	propDef,
]) => {
	const relType = types.find(type => type.name === propDef.type);
	if (!relType) {
		return;
	}
	const { hasMany } = getRelationship(relType, name);

	return {
		description: stripEmptyFirstLine`
		${propDef.description}
		*NOTE: This gives access to properties on the relationships between records
		as well as on the records themselves. Use '${propName}' instead if you do not need this*`,
		name: `${propName}REL`,
		pagination: maybePaginate({ hasMany }),
		type: maybePluralType({ type: relType.name, hasMany }),
		deprecation: maybeDeprecate(propDef),
		directive: '',
	};
};

const printRichRelationshipPropertyDefinitions = (types, name, properties) =>
	Object.entries(properties)
		.map(buildRichRelationshipPropertyModel(types, name))
		.filter(it => !!it)
		.map(printPropertyDefinition)
		.join('');

const printRelationshipTypeDefinition = (
	types,
	{ from, to, name, relationship, properties },
) =>
	printDescribedBlock(
		'Internal use only',
		stripIndent`
	type ${name} @relation(name: ${relationship}) {
		from: ${from}
		to: ${to}
		${indentMultiline(printPropertyDefinitions(types, name, properties), 4, true)}
	}`,
	);

const printRelationshipTypeDefinitions = types => {
	const relationshipTypes = types.filter(
		({ relationship }) => !!relationship,
	);
	return uniqBy(
		// eslint-disable-next-line unicorn/prefer-flat-map
		[].concat(...relationshipTypes.map(buildRelationshipTypeModel)),
		({ name }) => name,
	).map(rel => printRelationshipTypeDefinition(types, rel));
};
/*
	Outputting Query definitions
*/

const getIdentifyingFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canIdentify);

const getFilteringFields = (types, config) =>
	Object.entries(config.properties).filter(([, { type }]) => {
		const rel = types.find(t => t.name === type);
		return !rel || !rel.relationship;
	});

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

const printPaginationDefinition = (types, name, paginate) =>
	paginate
		? indentMultiline(
				printPropertyDefinitions(types, name, paginationConfig),
				4,
				true,
		  )
		: '';

const printQueryDefinition = (types, query) => {
	const { name, type, description, properties, paginate } = query;

	return printDescribedBlock(
		description,
		`${name}(
		${printPaginationDefinition(types, name, paginate)}
		${indentMultiline(printPropertyDefinitions(types, name, properties), 4, true)}
	): ${type}`,
	);
};

const printQueryDefinitions = types => {
	const dataTypes = types.filter(({ relationship }) => !relationship);
	return [
		'type Query {\n',
		...dataTypes.map(config =>
			[
				printQueryDefinition(types, {
					name: config.name,
					type: config.name,
					description: config.description,
					properties: getIdentifyingFields(config),
				}),
				printQueryDefinition(types, {
					name: config.pluralName,
					type: `[${config.name}]`,
					description: config.description,
					properties: getFilteringFields(types, config),
					paginate: true,
				}),
			].join('\n'),
		),
		'}',
	];
};

/*
	Outputting types
*/

const printTypeDefinition = (types, { name, description, properties }) =>
	printDescribedBlock(
		description,
		stripEmptyFirstLine`
type ${name} {
	${indentMultiline(printPropertyDefinitions(types, name, properties), 2, true)}
	${indentMultiline(
		printRichRelationshipPropertyDefinitions(types, name, properties),
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
		const types = this.getTypes({
			primitiveTypes: 'graphql',
			includeMetaFields: true,
		});
		const enums = this.getEnums({ withMeta: true });

		const temporalTypeDefinitions = stripIndent`
		scalar DateTime
		scalar Date
		scalar Time
	`;
		const typeDefinitions = types
			.filter(({ relationship }) => !relationship)
			.map(type => printTypeDefinition(types, type));

		const relationshipTypeDefinitions = printRelationshipTypeDefinitions(
			types,
		);

		const enumDefinitions = Object.entries(enums).map(printEnumDefinition);

		const queryDefinition = printQueryDefinitions(types);

		return [].concat(
			temporalTypeDefinitions,
			typeDefinitions,
			relationshipTypeDefinitions,
			queryDefinition,
			enumDefinitions,
		);
	},
};
