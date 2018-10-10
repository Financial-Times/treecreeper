const rawData = require('../../lib/raw-data');
const { expect } = require('chai');
const types = rawData.getTypes();
const stringPatterns = rawData.getStringPatterns();
const enums = rawData.getEnums();
const getStringValidator = require('../../lib/get-string-validator');
const ATTRIBUTE_NAME = getStringValidator('ATTRIBUTE_NAME');
const readYaml = require('../../lib/read-yaml');
const primitiveTypesMap = require('../../lib/primitive-types-map');
const fs = require('fs');
const path = require('path');

const getTwinnedRelationship = (
	homeTypeName,
	awayTypeName,
	relationshipName,
	homeDirection
) => {
	const awayType = types.find(({ name }) => name === awayTypeName);
	return Object.values(awayType.properties).find(
		({ relationship, type, direction }) =>
			relationship === relationshipName &&
			type === homeTypeName &&
			direction !== homeDirection
	);
};

describe('data quality: types', () => {
	const validEnums = Object.keys(enums);
	const validStringPatterns = Object.keys(stringPatterns);
	const typeNames = types.map(({ name }) => name);
	const validPropTypes = validEnums.concat(
		Object.keys(primitiveTypesMap),
		typeNames
	);

	fs.readdirSync(path.join(process.cwd(), 'schema/types'))
		.filter(fileName => /\.yaml$/.test(fileName))
		.map(fileName => {
			it(`${fileName} has consistent name property`, () => {
				const contents = readYaml.file(path.join('types', fileName));
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
			const fieldsets = type.fieldsets;
			const validFieldsetNames = fieldsets ? ['self'].concat(Object.keys(fieldsets)) : [];

			if (fieldsets) {
				describe('fieldsets', () => {
					it('is an object if it exists', () => {
						expect(fieldsets).to.be.an('object');
					})
					Object.entries(type.fieldsets).forEach(([name, fieldsetConfig]) => {
						describe(name, () => {
							it('has a heading', () => {
								expect(fieldsetConfig.heading).to.be.a('string');
							});
							it('may have a description', () => {
								if ('description' in fieldsetConfig) {
									expect(fieldsetConfig.description).to.be.a('string');
								}
							});
						});
					});
				});
			}

			describe('properties', () => {
				Object.entries(type.properties).forEach(([name, config]) => {
					describe(name, () => {
						it('has no unrecognised properties in its config', () => {
							Object.keys(config).forEach(key => {
								const commonKeys = ['type', 'description', 'label'];
								if (fieldsets) {
									commonKeys.push('fieldset');
								}
								if (typeNames.includes(config.type)) {
									// it's a relationship
									expect(key).to.be.oneOf(
										commonKeys.concat([
											'direction',
											'relationship',
											'hasMany',
											'isRecursive',
											'hidden'
										])
									);
								} else {
									expect(key).to.be.oneOf(
										commonKeys.concat([
											'unique',
											'required',
											'canIdentify',
											'canFilter',
											'pattern'
										])
									);
								}
							});
						});

						it('has valid name', () => {
							if (name !== 'SF_ID') {
								expect(name).to.match(ATTRIBUTE_NAME);
							}
						});

						it('has valid label', () => {
							expect(config.label).to.be.a('string');
						});
						it('has valid description', () => {
							expect(config.description).to.be.a('string');
						});
						it('has valid type', () => {
							expect(config.type).to.exist;
							expect(config.type).to.be.oneOf(validPropTypes);
						});

						it('has valid fieldset', () => {
							if (config.fieldset) {
								expect(validFieldsetNames).to.contain(config.fieldset)
							}
						})

						if (!typeNames.includes(config.type)) {
							context('direct property', () => {
								// tests for direct properties
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
						} else {
							const RELATIONSHIP_NAME = getStringValidator('RELATIONSHIP_NAME');
							context('relationship property', () => {
								it('must specify underlying relationship', () => {
									expect(config.relationship).to.match(RELATIONSHIP_NAME);
								});
								it('must specify direction', () => {
									expect(config.direction).to.be.oneOf([
										'incoming',
										'outgoing'
									]);
								});
								it('may be hidden', () => {
									if (config.hidden) {
										expect(config.hidden).to.be.true;
									}
								});

								it('may have many', () => {
									if (config.hasMany) {
										expect(config.hasMany).to.be.true;
									}
								});
								it('may be recursive', () => {
									if (config.isRecursive) {
										expect(config.isRecursive).to.be.true;
									}
								});
								it('is defined at both ends', () => {
									expect(
										getTwinnedRelationship(
											type.name,
											config.type,
											config.relationship,
											config.direction
										)
									).to.exist;
								});
							});
						}
					});
				});
			});
		});
	});
});
