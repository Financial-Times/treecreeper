const { componentAssigner } = require('@financial-times/tc-ui/server');

const customComponents = require('../templates/components/primitives');

const customComponentMap = {
	Paragraph: 'LargeText',
};

module.exports = {
	assignComponent: componentAssigner({
		customComponents,
		customTypeMappings: customComponentMap,
	}),
};
