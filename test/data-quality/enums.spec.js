const rawData = require('../../lib/raw-data');
const enums = rawData.getEnums();
describe('data quality: enum spec', () => {
	Object.entries(enums).forEach(([name, { description, options }]) => {
		describe(name, () => {
			it('has a description', () => {
				expect(description).to.be.a.string;
				expect(description.length).to.be.at.least(1);
			});
			it('has an array or object of options', () => {
				expect(Array.isArray(options) || typeof options === 'object').to.be
					.true;
			});
			if (Array.isArray(options)) {
				it('has only string keys', () => {
					options.forEach(opt => expect(opt).to.be.a.string);
				});
				it('has no numbers in keys', () => {
					options.forEach(opt => expect(opt).not.to.match(/\d/));
				});
			} else {
				it('has only string keys', () => {
					Object.keys(options).forEach(opt => expect(opt).to.be.a.string);
				});
				it('has only string values', () => {
					Object.values(options).forEach(opt => expect(opt).to.be.a.string);
				});
				it('has no numbers in keys', () => {
					Object.keys(options).forEach(opt => expect(opt).not.to.match(/\d/));
				});
			}
		});
	});
});
