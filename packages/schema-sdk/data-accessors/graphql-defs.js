const stripIndent = require('common-tags/lib/stripIndent');

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

const graphqlDirection = direction => (direction === 'outgoing' ? 'OUT' : 'IN');

const maybePluralType = def => (def.hasMany ? `[${def.type}]` : def.type);

const maybePaginate = def => (def.hasMany ? '(first: Int, offset: Int)' : '');

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
		return `@relation(name: "${
			def.relationship
		}", direction: "${graphqlDirection(def.direction)}")`;
	}

	return '';
};

const maybeDeprecate = ({ deprecationReason }) => {
	if (!deprecationReason) {
		return '';
	}
	return `@deprecated(reason: "${deprecationReason.replace(/"/g, '\\"')}")`;
};

const defineProperties = properties => properties
		.map(
			([name, def]) =>
				stripEmptyFirstLine`
			"""
			${def.description}
			"""
			${name}${maybePaginate(def)}: ${maybePluralType(def)} ${maybeDirective(
					def,
				)} ${maybeDeprecate(def)}`,
		)
		.join('');

const definePropertiesForRelationshipSchema = (properties, firstNode) => properties
		.map(
			([name, def]) =>
				stripEmptyFirstLine`
				"""
				${def.description}
				"""
				${name}${maybePaginate(def)}: ${def.isRelationship ? relationshipPluralType(def, firstNode) : maybePluralType(def)} ${maybeDeprecate(def)}`
			)
		.join('');

const relationshipPluralType = (def, firstNode) => {
	const from = def.direction === 'incoming' ? def.type : firstNode;
	const to = def.direction === 'incoming' ? firstNode : def.type;
	const fullNameCaps = `${from.toUpperCase()}_${
		def.relationship
	}_${to.toUpperCase()}`;
	return `[${snakeToCamel(fullNameCaps)}]`
}


const PAGINATE = indentMultiline(
	defineProperties(
		Object.entries({
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
	),
	4,
	true,
);

const getIdentifyingFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canIdentify);

const getFilteringFields = config =>
	Object.entries(config.properties).filter(
		([, { isRelationship }]) => !isRelationship,
	);

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

const defineType = config => {
	return `
	"""
	${config.description}
	"""
	type ${config.name} {
		${indentMultiline(defineProperties(Object.entries(config.properties)), 2, true)}
	}`;
}

const defineTypeWithRelationshipSchema = config => {
	// const properties = Object.entries(config.properties).filter(([name, def]) => !def.isRelationship)
	const properties = definePropertiesForRelationshipSchema(Object.entries(config.properties), config.name);
	return `
		"""
		${config.description}
		"""
		type ${config.name} {
			${indentMultiline(properties, 2, true)}
		}`;
}

const defineRelationshipTypes = config => {
	const relationships = Object.entries(config.properties).filter(([name, def]) => def.isRelationship);
	const relationshipTypes = relationships.map(defineRelationshipType(config.name))
	return [...relationshipTypes]
}

const defineRelationshipType = (firstNode) => ([name, def]) => {
	const from = def.direction === 'incoming' ? def.type : firstNode;
	const to = def.direction === 'incoming' ? firstNode : def.type;
	const fullNameCaps = `${from.toUpperCase()}_${
		def.relationship
	}_${to.toUpperCase()}`;
	return `\n\ttype ${snakeToCamel(fullNameCaps)} @relation(name: ${def.relationship}) {
		from: ${from}
		to: ${to}
	}`;
}

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
	const enums = Object.entries(options).map(([, option]) => {
		if (option.description) {
			return stripIndent`
				"""
				${option.description}
				"""
				${option.value}`;
		}

		return `${option.value}`;
	});

	return stripIndent`
		"""
		${description}
		"""
		enum ${name} {
		${indentMultiline(enums.join('\n'), 3)}
		}`;
};

function flatten(arr) {
	return arr.reduce(function(flat, toFlatten) {
		return flat.concat(
			Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten,
		);
	}, []);
}

module.exports = {
	accessor(representRelationshipsAsNodes = true) {
		const typesFromSchema = this.getTypes({
			primitiveTypes: 'graphql',
			includeMetaFields: true,
		});
		const customDateTimeTypes = stripIndent`
		scalar DateTime
		scalar Date
		scalar Time
	`;
		// const typeNamesAndDescriptions = typesFromSchema.map(defineType);
		const mapTypes = representRelationshipsAsNodes
			? defineTypeWithRelationshipSchema
			: defineType;

		const typeNamesAndDescriptions = typesFromSchema.map(mapTypes);

		const relationshipTypes = flatten(typesFromSchema.map(defineRelationshipTypes));

		const uniqueRelationshipTypes = [
			...new Set(relationshipTypes),
		];

		const enums = Object.entries(this.getEnums({ withMeta: true })).map(
			defineEnum,
		);

		return [].concat(
			customDateTimeTypes + typeNamesAndDescriptions,
			...uniqueRelationshipTypes,
			'type Query {\n',
			...typesFromSchema.map(defineQueries),
			'}',
			enums,
		);
	},
};
