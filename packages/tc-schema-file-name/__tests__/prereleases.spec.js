describe('calculating schema file name - prereleases', () => {
	it('uses major version with prereleases as file name for prereleases', () => {
		jest.doMock('../package.json', () => ({ version: '8.9.10-beta.1' }), {
			virtual: true,
		});

		const { getSchemaFilename } = require('..');
		expect(getSchemaFilename()).toBe('v8-prerelease.json');
		jest.dontMock('../package.json');
	});
});
