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

const describedBlock = (description, content) => stripEmptyFirstLine`
"""
${description}
"""
${content}
`;

const generateProperty = ({
	description,
	name,
	pagination,
	type,
	directive,
	deprecation,
}) =>
	describedBlock(
		description,
		`${name}${pagination}: ${type} ${directive} ${deprecation}`,
	);

const generateEnumOption = ({ value, description }) =>
	describedBlock(description || value, value);

const generateRelationshipType = ({ from, to, typeName, relationship }) =>
	describedBlock(
		'Internal use only',
		stripIndent`
	type ${typeName} @relation(name: ${relationship}) {
		from: ${from}
		to: ${to}
	}`,
	);

const maybePluralType = ({ type, hasMany }) => (hasMany ? `[${type}]` : type);

const maybePaginate = ({ hasMany }) =>
	hasMany ? '(first: Int, offset: Int)' : '';

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

const toPropertyModel = ([name, def]) => ({
	description: def.description,
	name,
	pagination: maybePaginate(def),
	type: maybePluralType(def),
	directive: maybeDirective(def),
	deprecation: maybeDeprecate(def),
});

const defineProperties = properties => {
	if (!Array.isArray(properties)) {
		properties = Object.entries(properties);
	}
	properties
		.map(toPropertyModel)
		.map(generateProperty)
		.join('');
};

const getFromTo = (direction, rootType, otherType) =>
	direction === 'outgoing' ? [rootType, otherType] : [otherType, rootType];

const getRichRelationshipType = (from, relationship, to) =>
	snakeToCamel(`${from.toUpperCase()}_${relationship}_${to.toUpperCase()}`);

const getRichRelationshipPropertyType = (def, rootType) => {
	const [from, to] = getFromTo(def.direction, rootType, def.type);

	return maybePluralType({
		type: getRichRelationshipType(from, def.relationship, to),
		hasMany: def.hasMany,
	});
};

const getRichRelationshipConfig = rootType => ([name, def]) => ({
	description: `*NOTE: This gives access to properties on the relationships between records
		as well as on the records themselves. Use '${name}' instead if you do not need this*
		${def.description}`,
	name: `${name}REL`,
	pagination: maybePaginate(def),
	type: getRichRelationshipPropertyType(def, rootType),
	deprecation: maybeDeprecate(def),
	directive: '',
});

const PAGINATE = indentMultiline(
	defineProperties({
		offset: {
			type: 'Int = 0',
			description: 'The pagination offset to use',
		},
		first: {
			type: 'Int = 20000',
			description:
				'The number of records to return after the pagination offset. This uses the default neo4j ordering',
		},
	}),
	4,
	true,
);

const getIdentifyingFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canIdentify);

const getFilteringFields = config =>
	Object.entries(config.properties).filter(
		([, { isRelationship }]) => !isRelationship,
	);

const defineRichRelationships = (properties, rootType) =>
	Object.entries(properties)
		.filter(([, { relationship }]) => relationship)
		.map(getRichRelationshipConfig(rootType))
		.map(generateProperty)
		.join('');

const defineQuery = ({ name, type, description, properties, paginate }) =>
	describedBlock(
		description,
		`${name}(
		${paginate ? PAGINATE : ''}
		${indentMultiline(defineProperties(properties), 4, true)}
	): ${type}`,
	);

const defineType = ({ name, description, properties }) =>
	describedBlock(
		description,
		stripEmptyFirstLine`
type ${name} {
	${indentMultiline(defineProperties(properties), 2, true)}
	${indentMultiline(defineRichRelationships(properties, name), 2, true)}
}`,
	);

const defineQueries = config => [
	defineQuery({
		name: config.name,
		type: config.name,
		description: config.description,
		properties: getIdentifyingFields(config),
	}),
	defineQuery({
		name: config.pluralName,
		type: `[${config.name}]`,
		description: config.description,
		properties: getFilteringFields(config),
		paginate: true,
	}),
];

const defineEnum = ([name, { description, options }]) => {
	const enums = Object.values(options).map(generateEnumOption);

	return describedBlock(
		description,
		`enum ${name} {
${indentMultiline(enums.join('\n'), 2)}
}`,
	);
};

const getRelationshipTypeConfig = ({ name, properties }) => {
	return properties
		.filter(({ relationship }) => !!relationship)
		.map(({ relationship, direction, type }) => {
			const [from, to] = getFromTo(direction, name, type);
			return {
				from,
				to,
				relationship,
				typeName: getRichRelationshipType(from, relationship, to),
			};
		});
};

const defineRelationshipTypes = types =>
	uniqBy([].concat(...types.map(getRelationshipTypeConfig), 'typeName')).map(
		generateRelationshipType,
	);

module.exports = {
	accessor() {
		const typesFromSchema = this.getTypes({
			primitiveTypes: 'graphql',
			includeMetaFields: true,
		});
		const customDateTimeTypes = stripIndent`
		scalar DateTime
		scalar Date
		scalar Time
	`;
		const types = typesFromSchema.map(defineType);

		const relationshipTypes = defineRelationshipTypes(typesFromSchema);

		const enums = Object.entries(this.getEnums({ withMeta: true })).map(
			defineEnum,
		);

		const queries = typesFromSchema.map(defineQueries);

		return [].concat(
			customDateTimeTypes,
			types,
			relationshipTypes,
			'type Query {\n',
			...queries,
			'}',
			enums,
		);
	},
};
