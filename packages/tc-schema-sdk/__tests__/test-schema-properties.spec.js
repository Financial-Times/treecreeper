const { SDK } = require('../sdk');

const schemaFixture = {
	types: [
		{
			name: 'TypeA',
			description: 'type a',
			properties: {
				code: {
					type: 'Code',
					unique: true,
					canIdentify: true,
					description: 'Code description.',
					label: 'Code label',
					pattern: 'CODE',
				},
				stringPropertyA: {
					type: 'Word',
					description: 'stringPropertyA description.',
					label: 'stringPropertyA label',
				},
				stringPropertyB: {
					type: 'Word',
					description: 'stringPropertyB description.',
					label: 'stringPropertyB label',
					isTest: true,
				},
			},
		},
		{
			name: 'TypeB',
			description: 'type b',
			isTest: true,
			properties: {
				code: {
					type: 'Code',
					unique: true,
					canIdentify: true,
					description: 'Code description.',
					label: 'Code label',
					pattern: 'CODE',
				},
			},
		},
	],
	relationshipTypes: [],
	stringPatterns: {
		CODE: '^(?=.{2,64}$)[a-z0-9]+(?:-[a-z0-9]+)*$',
	},
	enums: {
		AnEnum: {
			description: 'Another example enum\n',
			options: {
				First: 'First option',
			},
		},
		ATestEnum: {
			description: 'Another example enum\n',
			isTest: true,
			options: {
				First: 'First option',
			},
		},
	},
	primitiveTypes: {
		Code: {
			graphql: 'String',
			component: 'Text',
		},
		Word: {
			graphql: 'String',
			component: 'Text',
		},
		Document: {
			graphql: 'String',
			component: 'LargeText',
		},
		Url: {
			graphql: 'String',
			component: 'Text',
		},
	},
	typeHierarchy: {
		prod: {
			label: 'Prod',
			description: 'Prod types',
			types: ['TypeA'],
		},
		test: {
			label: 'Test',
			description: 'Test types',
			types: ['TypeB'],
		},
	},
};

describe('test schema properties', () => {

	// Note that this behaviour is the opposite as tc-schema-publisher
	// This is because, consider teh test environment:
	// 1. tc-schema-publisher explicitly publishes including test properties
	// 2. Now that they are in, we don't want any instance of the SDK running in a
	//		test app to strip them out again!
	it('includes test properties by default', async () => {
		const schema = new SDK({
			schemaData: { schema: schemaFixture },
			includeTestDefinitions: true,
		});
		await schema.ready();
		expect(schema.getTypes().length).toEqual(2);
		expect(schema.getTypes()[0].name).toEqual('TypeA');
		expect(schema.getTypes()[1].name).toEqual('TypeB');
		expect(Object.keys(schema.getTypes()[0].properties)).toEqual([
			'code',
			'stringPropertyA',
			'stringPropertyB',
		]);
		expect(Object.keys(schema.getEnums())).toEqual(['AnEnum', 'ATestEnum']);
		expect(Object.keys(schema.getTypes({ grouped: true }))).toEqual([
			'prod',
			'test',
		]);
		expect(schema.getTypes({ grouped: true }).prod.types[0].name).toEqual(
			'TypeA',
		);
		expect(schema.getTypes({ grouped: true }).test.types[0].name).toEqual(
			'TypeB',
		);
	});

	it('excludes test properties on demand', async () => {
		const schema = new SDK({ schemaData: { schema: schemaFixture } });
		await schema.ready();
		expect(schema.getTypes().length).toEqual(1);
		expect(schema.getTypes()[0].name).toEqual('TypeA');
		expect(Object.keys(schema.getTypes()[0].properties)).toEqual([
			'code',
			'stringPropertyA',
		]);
		expect(Object.keys(schema.getEnums())).toEqual(['AnEnum']);
		expect(Object.keys(schema.getTypes({ grouped: true }))).toEqual([
			'prod',
		]);
		expect(schema.getTypes({ grouped: true }).prod.types[0].name).toEqual(
			'TypeA',
		);
	});
});
