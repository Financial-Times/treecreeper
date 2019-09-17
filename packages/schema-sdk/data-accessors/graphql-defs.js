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

const relFragment = (type, direction, depth = '') => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[:${type}${depth}]-${right}`;
};

const maybePluralType = def => (def.hasMany ? `[${def.type}]` : def.type);

const maybePaginate = def =>
	def.isRelationship && def.hasMany ? '(first: Int, offset: Int)' : '';

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

const cypherResolver = def => {
	if (!def.isRelationship) {
		return '';
	}
	if (def.isRecursive) {
		return `@cypher(
			statement: "MATCH (this)${relFragment(
				def.relationship,
				def.direction,
				'*1..20',
			)}(related:${def.type}) RETURN DISTINCT related"
		)`;
	}
	return `@relation(name: "${
		def.relationship
	}", direction: "${graphqlDirection(def.direction)}")`;
}

const cypherRelationshipResolver = (def, originalType) => {
	if (!def.isRelationship) {
		return '';
	}
	if (def.isRecursive) {
		return `@cypher(
			statement: "MATCH (this)${relFragment(
				def.relationship,
				def.direction,
				'*1..20',
			)}(related:${def.type}) RETURN DISTINCT related"
		)`;
	}
	const from = def.direction === 'incoming' ? def.type : originalType;
	const to = def.direction === 'incoming' ? originalType : def.type;
	const node = `${from.toUpperCase()}_${
		def.relationship
	}_${to.toUpperCase()}`;
	return `type ${snakeToCamel(node)} @relation(name: ${node}) {
		from: ${from}
		to: ${to}
	}`;
};

const maybeDeprecate = ({ deprecationReason }) => {
	if (!deprecationReason) {
		return '';
	}
	return `@deprecated(reason: "${deprecationReason.replace(/"/g, '\\"')}")`;
};

const defineProperties = (properties, originalType) => {
	// console.log('..........originalType ', originalType)
	const props = properties
		.map(
			([name, def]) => {
				// console.log('def..........', name, def)
				return stripEmptyFirstLine`
				"""
				${def.description}
				"""
				${name}${maybePaginate(def)}: ${maybePluralType(def)} ${originalType ? '' : cypherResolver(
						def
					)}${maybeDeprecate(def)}`
			}
		)
		.join(' ');

	const typesFromRelationships = originalType ? properties.map(
		([name, def]) => `\n\t${cypherRelationshipResolver(def, originalType)}`,
	) : [] ;
	// console.log(props, typesFromRelationships)
	return { props, typesFromRelationships };
};

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
	).props,
	4,
	true,
);

const getIdentifyingFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canIdentify);

const getFilteringFields = config =>
	Object.entries(config.properties).filter(
		([, value]) => !Object.keys(value).includes('relationship'),
	);

const defineQuery = ({ name, type, description, properties, paginate }) => {
	return `
	"""
	${description}
	"""
	${name}(
		${paginate ? PAGINATE : ''}
		${indentMultiline(defineProperties(properties).props, 4, true)}
	): ${type}`;
};

const defineType = config =>
`
"""
${config.description}
"""
type ${config.name} {
	${indentMultiline(defineProperties(Object.entries(config.properties)).props, 2, true)}
}`;

const defineTypeWithRelationshipTypes = config => {
	const { props, typesFromRelationships } = defineProperties(
		Object.entries(config.properties),
		config.name,
	);
	return [
		`
		"""
		${config.description}
		"""
		type ${config.name} {
			${indentMultiline(props, 2, true)}
		}`,
		...typesFromRelationships,
	];
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
	accessor(representRelationshipsAsNodes = false) {
		const typesFromSchema = this.getTypes({
			primitiveTypes: 'graphql',
			relationshipStructure: 'graphql',
			includeMetaFields: true,
		});

		const customDateTimeTypes = stripIndent`
		scalar DateTime
		scalar Date
		scalar Time
	`;
		const mapTypes = representRelationshipsAsNodes ? defineTypeWithRelationshipTypes : defineType;
		const typeNamesAndDescriptions = typesFromSchema.map(mapTypes).flat();
		const uniqueTypeNamesAndDescriptions = [
			...new Set(typeNamesAndDescriptions),
		];
		const enums = Object.entries(this.getEnums({ withMeta: true })).map(
			defineEnum,
		);

		return [].concat(
			customDateTimeTypes + uniqueTypeNamesAndDescriptions,
			'type Query {\n',
			...typesFromSchema.map(defineQueries),
			'}',
			enums,
		);
	},
};
