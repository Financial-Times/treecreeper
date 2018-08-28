const readYaml = require('../../schema/lib/read-yaml');
const { expect } = require('chai');
const types = readYaml.directory('schema/types');
const { enumsSchema, stringPatterns } = require('../../schema');
const fs = require('fs');
const path = require('path');

describe('schema - types', () => {
	const validEnums = Object.keys(enumsSchema);
	const validStringPatterns = Object.keys(stringPatterns);
	const validPropTypes = validEnums.concat([
		'String',
		'Int',
		'Float',
		'Boolean'
	]);
	describe('raw data', () => {
		fs
			.readdirSync(path.join(process.cwd(), 'schema/types'))
			.filter(fileName => /\.yaml$/.test(fileName))
			.map(fileName => {
				it(`${fileName} has consistent name property`, () => {
					const contents = readYaml.file(path.join('schema/types', fileName));
					expect(`${contents.name}.yaml`).to.equal(fileName);
				});
			});

		types.forEach(type => {
			describe(`${type.name}`, () => {
				it('has a name', () => {
					expect(type.name).to.be.a('string');
				});
				it('has a description', () => {
					expect(type.description).to.be.a('string');
				});
				it('may have a plural name', () => {
					if ('pluralName' in type) {
						expect(type.pluralName).to.be.a('string');
					}
				});
				describe('properties', () => {
					Object.entries(type.properties).forEach(([name, config]) => {
						describe(name, () => {
							it('has no unrecognised properties in its config', () => {
								Object.keys(config).forEach(key => {
									expect(key).to.be.oneOf([
										'type',
										'unique',
										'required',
										'canIdentify',
										'canFilter',
										'label',
										'description',
										'pattern'
									]);
								});
							});
							it('has valid name', () => {
								if (name !== 'SF_ID') {
									expect(name).to.match(stringPatterns.ATTRIBUTE_NAME);
								}
							});
							it('has valid description', () => {
								expect(config.description).to.be.a('string');
							});
							it('has valid type', () => {
								expect(config.type).to.exist;
								expect(config.type).to.be.oneOf(validPropTypes);
							});
							it('may be required', () => {
								if (config.required) {
									expect(config.required).to.be.true;
								}
							});
							it('may be an identifier', () => {
								if (config.canIdentify) {
									expect(config.canIdentify).to.be.true;
								}
							});
							it('may be a filterer', () => {
								if (config.canFilter) {
									expect(config.canFilter).to.be.true;
								}
							});

							it('may define a pattern', () => {
								if (config.pattern) {
									expect(config.pattern).to.be.oneOf(validStringPatterns);
								}
							});
						});
					});
				});
			});
		});
	});
});
