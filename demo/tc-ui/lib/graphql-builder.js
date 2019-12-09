const { getType, getTypes } = require('@financial-times/tc-schema-sdk');

const toGraphql = ({ name, properties, sortField }) => {
	if (!properties) {
		return name;
	}

	return `${name} ${
		sortField ? `(orderBy: ${sortField}_asc)` : ''
	}{${properties.map(toGraphql).join('\n')}}`;
};

const outputDeepProperties = (properties, depth) =>
	Object.entries(properties)
		.filter(([, { deprecationReason }]) => !deprecationReason)
		.map(([propName, { type, isRelationship, hasMany }]) => {
			if (
				getTypes()
					.map(({ name }) => name)
					.includes(type)
			) {
				// 2 functions recursively call each other - one must come before the other
				// eslint-disable-next-line no-use-before-define
				return build(
					type,
					[],
					depth - 1,
					propName,
					isRelationship && hasMany,
				);
			}
			if (type === 'DateTime' || type === 'Date' || type === 'Time') {
				return {
					type,
					name: propName,
					properties: [{ name: 'formatted' }],
				};
			}
			return { name: propName };
		});

const coreProperty = propName =>
	['code', 'name', 'serviceTier', 'lifecycleStage', 'isActive'].includes(
		propName,
	);

const outputShallowProperties = properties =>
	Object.entries(properties)
		.filter(([propName]) => coreProperty(propName))
		.map(([propName]) => ({ name: propName }));

const build = (recordType, subtypes, depth = 1, propName, isSortable) => {
	const baseType = getType(recordType, {
		relationshipStructure: 'graphql',
		includeMetaFields: true,
	});

	const validProperties = { ...baseType.properties };
	// Filter out anything which is not a required subtype - including basic details - leaving just the relationships
	if (subtypes.length) {
		Object.entries(validProperties).forEach(
			([unfilteredPropName, { type, isRelationship }]) => {
				if (
					!coreProperty(unfilteredPropName) &&
					(!isRelationship || !subtypes.includes(type))
				) {
					delete validProperties[unfilteredPropName];
				}
			},
		);
	}

	const ast = {
		type: baseType.name,
		name: propName,
		properties: depth
			? outputDeepProperties(validProperties, depth)
			: outputShallowProperties(validProperties),
	};
	if (isSortable) {
		ast.sortField = ast.properties.some(({ name }) => name === 'name')
			? 'name'
			: 'code';
	}
	return ast;
};

module.exports = (type, subtypes = []) => {
	const ast = build(type, subtypes);
	return `
	query getStuff($itemId: String!) {
    ${ast.type} (code: $itemId) {
    ${ast.properties.map(toGraphql).join('\n')}
  }
}
`;
};
