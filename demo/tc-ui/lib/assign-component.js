const { componentAssigner } = require('@financial-times/tc-ui/server');

const customComponents = {};

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
