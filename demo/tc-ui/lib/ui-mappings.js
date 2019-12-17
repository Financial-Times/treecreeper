const {
	componentAssigner,
	graphqlQueryBuilder,
} = require('@financial-times/tc-ui/server');

const customComponents = require('../templates/components/primitives');

const customComponentMap = {
	Paragraph: 'LargeText',
};

const assignComponent = componentAssigner({
	customComponents,
	customTypeMappings: customComponentMap,
});

module.exports = {
	assignComponent,
	graphqlBuilder: type => graphqlQueryBuilder(type, assignComponent),
};
