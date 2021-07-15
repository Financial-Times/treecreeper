const { SDK } = require('../../sdk');

describe('get-primitive-types', () => {
	const sdk = new SDK({
		schemaData: {
			schema: {
				primitiveTypes: {
					SpecialString: {
						graphql: 'String',
						component: 'Text',
					},
					Size: {
						graphql: 'Int',
						component: 'Number',
					},
				},
			},
		},
	});

	it('can get as map to graphql type', () => {
		expect(sdk.getPrimitiveTypes({ output: 'graphql' })).toMatchObject({
			SpecialString: 'String',
			Size: 'Int',
		});
	});
	it('can get as map to component type', () => {
		expect(sdk.getPrimitiveTypes({ output: 'component' })).toMatchObject({
			SpecialString: 'Text',
			Size: 'Number',
		});
	});
	it('maps graphQL types by default', () => {
		expect(sdk.getPrimitiveTypes({ output: 'graphql' })).toMatchObject({
			Code: 'String',
			String: 'String',
			Date: 'Date',
			Time: 'Time',
			DateTime: 'DateTime',
			Int: 'Int',
			Float: 'Float',
			Boolean: 'Boolean',
		});
	});
	it('maps graphQL types to components by default', () => {
		expect(sdk.getPrimitiveTypes({ output: 'component' })).toMatchObject({
			Code: 'Text',
			String: 'Text',
			Date: 'Temporal',
			Time: 'Temporal',
			DateTime: 'Temporal',
			Int: 'Number',
			Float: 'Number',
			Boolean: 'Boolean',
		});
	});

	it('can override default type', () => {
		const overridenSdk = new SDK({
			schemaData: {
				schema: {
					primitiveTypes: {
						String: {
							graphql: 'Float',
							component: 'Temporal',
						},
					},
				},
			},
		});

		expect(
			overridenSdk.getPrimitiveTypes({ output: 'component' }).String,
		).toEqual('Temporal');
		expect(
			overridenSdk.getPrimitiveTypes({ output: 'graphql' }).String,
		).toEqual('Float');
	});
});
