const mockS3Instance = {
	upload: jest.fn().mockReturnThis(),
	promise: jest.fn(),
};

jest.mock('aws-sdk', () => {
	return { S3: jest.fn(() => mockS3Instance) };
});

const { deploy } = require('../deploy');

describe('tc-schema-sdk/deploy test', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('can deploy with test properties', async () => {
		require('../deploy');

		await deploy({
			schemaDirectory: `packages/tc-schema-publisher/scripts/__tests__/schema`,
			bucketName: 'blah',
			includeTestDefinitions: true,
			env: 'latest',
		});

		expect(mockS3Instance.upload).toHaveBeenCalled();
		const body = mockS3Instance.upload.mock.calls[0][0].Body;
		let content = '';
		body.on('data', chunk => {
			content += chunk.toString('utf8');
		});
		await new Promise(res => {
			body.on('end', res);
		});
		const { schema } = JSON.parse(content);
		expect(schema.types.length).toEqual(2);
		expect(schema.types[0].name).toEqual('TypeA');
		expect(schema.types[1].name).toEqual('TypeB');
		expect(Object.keys(schema.types[0].properties)).toEqual([
			'code',
			'stringPropertyA',
			'stringPropertyB',
		]);
		expect(Object.keys(schema.enums)).toEqual(['AnEnum', 'ATestEnum']);
		expect(Object.keys(schema.typeHierarchy)).toEqual(['prod', 'test']);
		expect(schema.typeHierarchy.prod.types).toEqual(['TypeA']);
		expect(schema.typeHierarchy.test.types).toEqual(['TypeB']);
	});
});
