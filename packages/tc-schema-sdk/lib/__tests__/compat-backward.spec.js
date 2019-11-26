const { compatBackward } = require('../compat-backward');

describe('Backward compatibility', () => {
	const newerSchemaDefinitionTypes = [
		{
			name: 'MainType',
			description: 'MainType description',
			properties: {
				code: {
					type: 'Code',
					unique: true,
					canIdentify: true,
					description: 'Code description',
					label: 'Code label',
					pattern: 'CODE',
				},
				hasChild: {
					type: 'HasChild',
					description: 'hasChild description',
					label: 'hasChild label',
				},
			},
		},
		{
			name: 'ChildType',
			description: 'ChildType description',
			properties: {
				code: {
					type: 'Code',
					unique: true,
					canIdentify: true,
					description: 'Code description',
					label: 'Code label',
					pattern: 'CODE',
				},
				isChildOf: {
					type: 'HasChild',
					description: 'isChildOf description',
					label: 'isChildOf label',
				},
			},
		},
	];
	const newerSchemDefinitionRelationships = [
		{
			name: 'HasChild',
			relationship: 'HAS_CHILD',
			properties: {
				someHasChildProp: {
					type: 'Word',
					description: 'someHasChildProp description',
					label: 'someHasChildProp label',
				},
			},
			from: {
				type: 'MainType',
				hasMany: false,
			},
			to: {
				type: 'ChildType',
				hasMany: true,
			},
		},
	];

	it('Transform schema relationship as old version', () => {
		const compatibleTypes = compatBackward(
			newerSchemaDefinitionTypes,
			newerSchemDefinitionRelationships,
		);
		const { properties: mainProps } = compatibleTypes.find(
			t => t.name === 'MainType',
		);
		const { properties: childProps } = compatibleTypes.find(
			t => t.name === 'ChildType',
		);
		expect(mainProps.hasChild).toMatchObject({
			relationship: 'HAS_CHILD',
			type: 'ChildType',
			description: 'hasChild description',
			direction: 'outgoing',
			hasMany: false,
			label: 'hasChild label',
			relationshipProperties: {
				someHasChildProp: {
					type: 'Word',
					description: 'someHasChildProp description',
					label: 'someHasChildProp label',
				},
			},
		});
		expect(childProps.isChildOf).toMatchObject({
			relationship: 'HAS_CHILD',
			type: 'MainType',
			description: 'isChildOf description',
			direction: 'incoming',
			hasMany: true,
			label: 'isChildOf label',
			relationshipProperties: {
				someHasChildProp: {
					type: 'Word',
					description: 'someHasChildProp description',
					label: 'someHasChildProp label',
				},
			},
		});
	});
});
