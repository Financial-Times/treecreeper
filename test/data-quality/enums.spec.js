const rawData = require('../../lib/raw-data');
const enums = rawData.getEnums();
describe.skip('data quality: enum spec', () => {
	Object.entries(enums).forEach(([name, enumDef]) => {
		describe(name, () => {
			it('has a description', () => {
				expect(enumDef.description).to.be.a.string;
			})
			it('has an array of options', () => {})
			it('has an object of key values', () => {})
			it('has no numbers in option keys	', () => {})
		})
	});



});
