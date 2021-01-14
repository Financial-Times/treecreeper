const { SchemaComposer } = require('graphql-compose');
const { GraphQLDirective, GraphQLString } = require('graphql');

/* utils */
const getGraphqlType = sdk => type => {
	return sdk.getPrimitiveTypes()[type] || type;
};

const PAGINATION_ARGS = { first: 'Int', offset: 'Int' };

const maybePluralise = (hasMany, type) => (hasMany ? [type] : type);

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

const getRelationshipTypeName = ({
	from: { type: from },
	to: { type: to },
	relationship,
}) => {
	return snakeToCamel(
		`${from.toUpperCase()}_${relationship}_${to.toUpperCase()}`,
	);
};

const addStaticDefinitions = composer => {
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

const addEnumDefinitions = (composer, sdk) => {
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

const getDirectives = ({ cypher, relationship }) => {
	const directives = [];

	if (cypher) {
		directives.push({
			name: 'cypher',
			args: {
				statement: cypher,
			},
		});
	}
	if (relationship) {
		directives.push({
			name: 'relation',
			args: {
				name: relationship,
			},
		});
	}
	return directives;
};

// TODO, should this check for `relationship` not `isRelationship` to avoid paginating @cypher props
const getArgs = ({ hasMany, isRelationship }) =>
	hasMany && isRelationship ? PAGINATION_ARGS : null;

const composeObjectProperties = ({ typeName, properties, sdk, composer }) => {
	const typeConverter = getGraphqlType(sdk);
	const objectTypeComposer = composer.types.get(typeName);

	Object.entries(properties).forEach(([fieldName, def]) => {
		objectTypeComposer.setField(fieldName, {
			description: def.description,
			type: () => maybePluralise(def.hasMany, typeConverter(def.type)),
			deprecationReason: def.deprecationReason,
			extensions: {
				directives: getDirectives(def),
			},
			args: getArgs(def),
		});

		if (def.relationship) {
			objectTypeComposer.setField(`${fieldName}_rel`, {
				description: `${def.description}
*NOTE: This gives access to properties on the relationships between records
as well as on the records themselves. Use '${fieldName}' instead if you do not need this*`,
				deprecationReason: def.deprecationReason,
				// extensions: {
				// 	directives:
				// 		typeName === def.type
				// 			? [
				// 					{
				// 						name: 'relation',
				// 					},
				// 			  ]
				// 			: [],
				// },
				type: () =>
					maybePluralise(
						def.hasMany,
						getRelationshipTypeName(
							sdk.getRelationshipType(typeName, fieldName),
						),
					),
				args: getArgs(def),
			});
		}
	});
};

const addTypeDefinition = (composer, sdk) => ({
	name: typeName,
	pluralName,
	description,
	properties,
}) => {
	composer.createObjectTC({ name: typeName, description });

	// Build up the type definition
	composeObjectProperties({ typeName, properties, sdk, composer });

	// Add the ability to query for a single record
	composer.Query.setField(typeName, {
		type: typeName,
		args: Object.fromEntries(
			Object.entries(properties)
				.filter(([, def]) => def.canIdentify)
				.map(([name, { type }]) => [name, getGraphqlType(sdk)(type)]),
		),
	});

	// Add the ability to query for a list of records
	composer.Query.setField(pluralName, {
		type: [typeName],
		args: {
			...PAGINATION_ARGS,
			...Object.fromEntries(
				Object.entries(properties)
					.filter(([, def]) => !def.relationship && !def.cypher)
					.map(([name, { type }]) => [
						name,
						getGraphqlType(sdk)(type),
					]),
			),
		},
	});
};

const addRelationshipTypeDefinition = (composer, sdk) => ({
	from,
	to,
	relationship,
	properties,
}) => {
	const typeName = getRelationshipTypeName({ from, to, relationship });

	// Use getOrCreate because the relationships type may be referenced
	// in muiltiple places
	composer.getOrCreateOTC({
		name: typeName,
		description: 'Internal use only',
		extensions: {
			directives: [
				{
					name: 'relation',
					args: {
						name: relationship,
					},
				},
			],
		},
	});

	const objectTypeComposer = composer.types.get(typeName);

	// As standard, relationship types must contain from and to
	objectTypeComposer.addFields({
		from: {
			type: () => from.type,
		},
		to: {
			type: () => to.type,
		},
	});

	// Add additional properties to the type exactly as though it were a normal type
	composeObjectProperties({ typeName, properties, sdk, composer });
};

const compose = sdk => {
	const composer = new SchemaComposer();
	// the handful of scalaras and directives we have to define with simple statements
	addStaticDefinitions(composer);

	addEnumDefinitions(composer, sdk);

	sdk.getTypes({
		includeMetaFields: true,
	}).forEach(addTypeDefinition(composer, sdk));

	// Note that this generates a list of relationship types for every single
	// Type1 -> Type2 relationship, even when not defined in the schema yaml files
	// This is so we can have a type that exposes the metadata fro every relationship
	// even if we don't need to add anuy custom properties to it
	sdk.getRelationshipTypes({
		includeMetaFields: true,
		excludeCypherRelationships: true,
	}).forEach(addRelationshipTypeDefinition(composer, sdk));

	return composer;
};

module.exports = {
	accessor() {
		return compose(this).toSDL();
	},
};
