const { SchemaComposer } = require('graphql-compose');
const {
	GraphQLDirective,
	GraphQLString,
} = require('graphql');

/* utils */
const getGraphqlType = sdk => type => {
	return sdk.getPrimitiveTypes()[type] || type;
};

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

const addTypeDefinition = (composer, sdk) => ({
	name: typeName,
	description,
	properties,
}) => {
	composer.createObjectTC({ name: typeName, description });
	composer.Query.setField(typeName, { type: typeName });
	const typeConverter = getGraphqlType(sdk);
	Object.entries(properties).forEach(([fieldName, def]) => {
		composer.types.get(typeName).setField(fieldName, {
			description: def.description,
			type: () => typeConverter(def.type),
			// {
			// 	pagination: maybePaginate(def),
			// 	type: maybePluralType({
			// 		...def,
			// 		type: this.getGraphqlType(def.type),
			// 	}),
			// 	directive: maybeDirective(def),
			// 	deprecation: maybeDeprecate(def),
			// }
		});
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

// 	getTypeDefinitions() {

// 	}

// 	/*
// 		Outputting types
// 	*/
// 	printTypeDefinition({ name, description, properties }) {
// 		return printDescribedBlock(
// 			description,
// 			stripEmptyFirstLine`

// type ${name} {
// 	${indentMultiline(this.printPropertyDefinitions(properties), 2, true)}
// 	${indentMultiline(
// 		this.printRichRelationshipPropertyDefinitions(properties, name),
// 		2,
// 		true,
// 	)}
// }`,
// 		);
// 	}
