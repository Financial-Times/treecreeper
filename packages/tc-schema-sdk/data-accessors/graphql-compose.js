const uniqBy = require('lodash.uniqby');
const { SchemaComposer } = require('graphql-compose')
const {GraphQLDirective,GraphQLScalarType,GraphQLString} = require('graphql');
const composeStaticDefinitions = (composer) => {
		composer.addDirective(new GraphQLDirective({
			name: 'deprecated',
			locations: ['FIELD_DEFINITION','ENUM_VALUE','ARGUMENT_DEFINITION'],
			args: { 'reason': {defaultValue: 'No longer supported', type: GraphQLString}}
		}))
		composer.createScalarTC('DateTime'));
		composer.createScalarTC('Date'));
		composer.createScalarTC('Time'));
	}
const compose = sdk => {
	const composer = new SchemaComposer()
	composeStaticDefinitions(composer);
	return composer
}

module.exports = {
	accessor() {
		return compose(this).toSDL();
	},
};



