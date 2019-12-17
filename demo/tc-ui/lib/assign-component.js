const { componentAssigner } = require('@financial-times/tc-ui/server');

const customComponents = require('../templates/components/primitives');

const customComponentMap = {
	Paragraph: 'LargeText',
	// SystemLifecycle: 'LifecycleStage',
	// ProductLifecycle: 'LifecycleStage',
	// ServiceTier,
	// TrafficLight,
	// Url,
	// Email,
};

module.exports = {
	assignComponent: componentAssigner({
		customComponents,
		customTypeMappings: customComponentMap,
	}),
};
