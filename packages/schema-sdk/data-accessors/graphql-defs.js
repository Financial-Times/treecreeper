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
		.map(word => word.charAt(0) + word.substring(1).toLowerCase())
		.join('');
	// const result = str.toLowerCase().replace(/_([a-z])/,function(m){return m.toUpperCase();}).replace(/_/,'');
	return camel;
};

const cypherResolver = (def, originalType) => {
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
	// console.log('def.............', def)
	const from = def.direction === 'incoming' ? def.type : originalType;
	const to = def.direction === 'incoming' ? originalType : def.type;
	// console.log(`type ${snakeToCamel(def.relationship)} @relation(name: ${def.relationship}) {
	// 	from: ${from}
	// 	to: ${to}
	// }`);
	return `type ${snakeToCamel(def.relationship)} @relation(name: ${
		def.relationship
	}) {
		from: ${from}
		to: ${to}
	}`;
	// return `@relation(name: "${
	// 	def.relationship
	// }", direction: "${graphqlDirection(def.direction)}")`;

	// type HasTeamMember @relation(name: "HAS_TEAM_MEMBER") {
	// 	from: Team
	// 	to: Person
	// }
};

const maybeDeprecate = ({ deprecationReason }) => {
	if (!deprecationReason) {
		return '';
	}
	return `@deprecated(reason: "${deprecationReason.replace(/"/g, '\\"')}")`;
};

const defineProperties = (properties, originalType) => {
	const props = properties
		.map(
			([name, def]) =>
				stripEmptyFirstLine`
				${name}${maybePaginate(def)}: ${maybePluralType(def)} ${maybeDeprecate(def)}`,
		)
		.join('');
	const typesFromRelationships = properties
		.map(([name, def]) => `\n\t${cypherResolver(def, originalType)}`)
	return { props, typesFromRelationships };
	// return properties
	// 	.map(
	// 		([name, def]) =>
	// 			stripEmptyFirstLine`
	// 		"""
	// 		${def.description}
	// 		"""
	// 		${name}${maybePaginate(def)}: ${maybePluralType(def)} ${cypherResolver(
	// 				def,
	// 				originalType
	// 			)} ${maybeDeprecate(def)}`,
	// 	)
	// 	.join('');
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
	${name}(
		${paginate ? PAGINATE : ''}
		${indentMultiline(defineProperties(properties).props, 4, true)}
	): ${type}`;
};

const defineType = config => {
	const { props, typesFromRelationships } = defineProperties(
		Object.entries(config.properties),
		config.name,
	);
	// console.log('typesFromRelationships...............', typesFromRelationships)
	return [
		`
	type ${config.name} {
		${indentMultiline(props, 2, true)}
	}`,
		...typesFromRelationships,
	];
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

const defineEnum = ([name, { description, options }]) => {
	const enums = Object.entries(options).map(([, option]) => {
		if (option.description) {
			return stripIndent`
				${option.value}`;
		}

		return `${option.value}`;
	});

	return stripIndent`
		enum ${name} {
		${indentMultiline(enums.join('\n'), 3)}
		}`;
};

module.exports = {
	accessor() {
		const typesFromSchema = this.getTypes({
			primitiveTypes: 'graphql',
			relationshipStructure: 'graphql',
			includeMetaFields: true,
		});
		// console.log('typesFromSchema....................', typesFromSchema)
		// console.log(typesFromSchema[0].properties.teams)
		const customDateTimeTypes = stripIndent`
		scalar DateTime
		scalar Date
		scalar Time
	`;

		const typeNamesAndDescriptions = typesFromSchema.map(defineType).flat();
		const uniqueTypeNamesAndDescriptions = [
			...new Set(typeNamesAndDescriptions),
		];
		console.log(
			'uniqueTypeNamesAndDescriptions........',
			uniqueTypeNamesAndDescriptions,
		);
		const enums = Object.entries(this.getEnums({ withMeta: true })).map(
			defineEnum,
		);

		return [].concat(
			uniqueTypeNamesAndDescriptions,
			'type Query {\n',
			...typesFromSchema.map(defineQueries),
			'}',
			enums,
		);
	},
};
