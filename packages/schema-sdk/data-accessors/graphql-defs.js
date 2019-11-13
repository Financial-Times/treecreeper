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

const getPropertyConfig = ([name, def]) => ({
	description: def.description,
	name,
	pagination: maybePaginate(def),
	type: maybePluralType(def),
	directive: maybeDirective(def),
	deprecation: maybeDeprecate(def),
});

const outputProperty = ({
	description,
	name,
	pagination,
	type,
	directive,
	deprecation,
}) =>
	stripEmptyFirstLine`
		"""
		${description}
		"""
		${name}${pagination}: ${type} ${directive} ${deprecation}`;

const defineProperties = properties => {
	if (!Array.isArray(properties)) {
		properties = Object.entries(properties);
	}
	properties
		.map(getPropertyConfig)
		.map(outputProperty)
		.join('');
};

const getRichRelationshipType = (def, rootType) => {
	const from = def.direction === 'incoming' ? def.type : rootType;
	const to = def.direction === 'incoming' ? rootType : def.type;
	const fullNameCaps = `${from.toUpperCase()}_${
		def.relationship
	}_${to.toUpperCase()}`;
	return maybePluralType({
		type: `${snakeToCamel(fullNameCaps)}`,
		hasMany: def.hasMany,
	});
};

const getRichRelationshipConfig = rootType => ([name, def]) => ({
	description: `*NOTE: This gives access to properties on the relationships between records
		as well as on the records themselves. Use '${name}' instead if you do not need this*
		${def.description}`,
	name: `${name}REL`,
	pagination: maybePaginate(def),
	type: getRichRelationshipType(def, rootType),
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
		.map(outputProperty)
		.join('');

const defineQuery = ({ name, type, description, properties, paginate }) => {
	return `
	"""
	${description}
	"""
	${name}(
		${paginate ? PAGINATE : ''}
		${indentMultiline(defineProperties(properties), 4, true)}
	): ${type}`;
};

const defineType = ({ name, description, properties }) => {
	return `
	"""
	${description}
	"""
	type ${name} {
		${indentMultiline(defineProperties(properties), 2, true)}
		${indentMultiline(defineRichRelationships(properties, name), 2, true)}
	}`;
};

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

const defineEnumOption = ([, { value, description }]) => {
	if (description) {
		return stripIndent`
				"""
				${description}
				"""
				${value}`;
	}

	return `${value}`;
};

const defineEnum = ([name, { description, options }]) => {
	const enums = Object.entries(options).map(defineEnumOption);

	return stripIndent`
		"""
		${description}
		"""
		enum ${name} {
		${indentMultiline(enums.join('\n'), 3)}
		}`;
};

const getRelationshipProperties = ({ name, properties }) => {
	return properties
		.filter(({ relationship }) => !!relationship)
		.map(({ relationship, direction, type }) => {
			const from = direction === 'incoming' ? type : name;
			const to = direction === 'incoming' ? name : type;
			return {
				from,
				to,
				relationship,
				typeName: snakeToCamel(
					`${from.toUpperCase()}_${relationship}_${to.toUpperCase()}`,
				),
			};
		});
};

const defineRelationshipTypes = types => {
	return uniqBy(
		[].concat(...types.map(getRelationshipProperties), 'typeName'),
	).map(
		({ from, to, typeName, relationship }) => stripIndent`
	type ${typeName} @relation(name: ${relationship}) {
		from: ${from}
		to: ${to}
	}`,
	);
};

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

		const relationshipTypes = defineRelationshipTypes(types);

		const enums = Object.entries(this.getEnums({ withMeta: true })).map(
			defineEnum,
		);

		return [].concat(
			customDateTimeTypes,
			...types,
			...relationshipTypes,
			'type Query {\n',
			...typesFromSchema.map(defineQueries),
			'}',
			enums,
		);
	},
};
