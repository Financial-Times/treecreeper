describe('calculating schema file name - normal', () => {
	it('uses major version as file name', () => {
		jest.doMock('../package.json', () => ({ version: '8.9.10' }), {
			virtual: true,
		});

		const { getSchemaFilename } = require('..');
		expect(getSchemaFilename()).toBe('v8.json');
		jest.dontMock('../package.json');
	});
});
