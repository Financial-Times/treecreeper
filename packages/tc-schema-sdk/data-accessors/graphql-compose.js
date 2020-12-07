const { SchemaComposer } = require('graphql-compose');
const {
	GraphQLDirective,
	GraphQLString,
} = require('graphql');

/* utils */
const getGraphqlType = sdk => type => {
	return sdk.getPrimitiveTypes()[type] || type;
};

const maybePluralise = (hasMany, type) => hasMany ? [type] : type;

const composeStaticDefinitions = composer => {
	composer.addDirective(
		new GraphQLDirective({
			name: 'deprecated',
			locations: [
				'FIELD_DEFINITION',
				'ENUM_VALUE',
				'ARGUMENT_DEFINITION',
			],
			args: {
				reason: {
					defaultValue: 'No longer supported',
					type: GraphQLString,
				},
			},
		}),
	);
	composer.createScalarTC('DateTime');
	composer.createScalarTC('Date');
	composer.createScalarTC('Time');
};

const composeEnumDefinitions = (composer, sdk) => {
	Object.entries(sdk.getEnums({ withMeta: true })).map(
		([name, { description: enumDescription, options }]) => {
			const values = {};
			Object.values(options).forEach(
				({ value, description: valueDescription }) => {
					values[value] = { description: valueDescription };
				},
			);
			composer.createEnumTC({
				name,
				description: enumDescription,
				values,
			});
		},
	);
};

const getDirectives = ({deprecationReason, cypher, relationship, direction}) => {
	const directives = [];

	if (cypher) {
		directives.push({ name: 'cypher', args: { statement: cypher
			.replace(/"/g, '\\"')
			.split(/\n/)
			.join('\\n')}})
	}
	if (relationship) {
		directives.push({name: 'relation', args: {
			name: relationship,
			args: {
				direction: direction === 'outgoing' ? 'OUT' : 'IN'
			}
		}})
	}
	return directives
}

const getArgs = ({ hasMany, isRelationship }) =>
	hasMany && isRelationship ? {first: 'Int', offset: 'Int'} : null

const addTypeDefinition = (composer, sdk) => ({
	name: typeName,
	description,
	properties,
}) => {
	const typeConverter = getGraphqlType(sdk);

	composer.createObjectTC({ name: typeName, description });
	composer.Query.setField(typeName, {
		type: typeName,
		args: getArgs(def)
	});

	Object.entries(properties).forEach(([fieldName, def]) => {
		composer.types.get(typeName).setField(fieldName, {
			description: def.description,
			type: () => maybePluralise(def.hasMany, typeConverter(def.type)),
			...(def.deprecationReason ? {deprecationReason: def.deprecationReason} : {}),
			extensions: {
				directives: getDirectives(def)
			},
			// TODO - is pagination needed to be se explicitly
			args: getArgs(def)
		});

		// 	${indentMultiline(
		// 		this.printRichRelationshipPropertyDefinitions(properties, name),
		// 		2,
		// 		true,
		// 	)}
	});
};

const compose = sdk => {
	const composer = new SchemaComposer();
	composeStaticDefinitions(composer);
	composeEnumDefinitions(composer, sdk);
	sdk.getTypes({
		includeMetaFields: true,
	}).map(addTypeDefinition(composer, sdk));
	return composer;
};

module.exports = {
	accessor() {
		return compose(this).toSDL();
	},
};
