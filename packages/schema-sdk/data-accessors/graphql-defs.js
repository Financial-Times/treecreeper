const stripIndent = require('common-tags/lib/stripIndent');

const flatten = (arr) => {
	return arr.reduce((flat, toFlatten) => {
		return flat.concat(
			Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten,
		);
	}, []);
}

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

const maybePluralType = ({type, hasMany}) => (hasMany ? `[${type}]` : type);

const maybePaginate = ({hasMany}) => (hasMany ? '(first: Int, offset: Int)' : '');

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
		}", direction: "${graphqlDirection(def.direction === 'outgoing' ? 'OUT' : 'IN')}")`;
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
		${name}${maybePaginate(def)}: ${maybePluralType(def)} ${maybeDirective(def)} ${maybeDeprecate(def)}`,
		)
		.join('');

const relationshipType = (def, rootType) => {
	const from = (def.direction === 'incoming') ? def.type : rootType;
	const to = (def.direction === 'incoming') ? rootType : def.type;
	const fullNameCaps = `${from.toUpperCase()}_${
		def.relationship
	}_${to.toUpperCase()}`;
	return maybePluralType({
		type: `${snakeToCamel(fullNameCaps)}`
		hasMany: def.hasMany
	})
}

const defineRichRelationships = (properties, rootType) => properties
		.filter(([, {relationship}]) => relationship)
		.map(
			([name, def]) =>
		stripEmptyFirstLine`
		"""
		*NOTE: This gives access to properties on the relationships between records
		as well as on the records themselves. Use '${name}' instead if you do not need this*
		${def.description}
		"""
		${name}REL${maybePaginate(def)}: ${relationshipType(def, rootType)} ${maybeDeprecate(def)}`
			)
		.join('');




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
		${indentMultiline(defineRichRelationships(Object.entries(config.properties), config.name), 2, true)}
	}`;
}

const defineRelationshipTypes = config => {
	const relationships = Object.entries(config.properties).filter(([name, def]) => def.isRelationship);
	const relationshipTypes = relationships.map(defineRelationshipType(config.name))
	return [...relationshipTypes]
}

const defineRelationshipType = (rootType) => ([name, def]) => {
	const from = def.direction === 'incoming' ? def.type : rootType;
	const to = def.direction === 'incoming' ? rootType : def.type;
	const fullNameCaps = `${from.toUpperCase()}_${
		def.relationship
	}_${to.toUpperCase()}`;
	return stripIndents`
	type ${snakeToCamel(fullNameCaps)} @relation(name: ${def.relationship}) {
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

		const relationshipTypes = [
			...new Set(flatten(typesFromSchema.map(defineRelationshipTypes)))];

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
