/* global it, describe, expect */
const validURL = require('valid-url');
const { SDK } = require('@financial-times/tc-schema-sdk');

const sdk = new SDK();
sdk.init();
const primitiveTypesMap = sdk.getPrimitiveTypes();
const { getStringValidator } = sdk;
const enums = sdk.rawData.getEnums();
const stringPatterns = sdk.rawData.getStringPatterns();
const relationshipTypes = sdk.rawData.getRelationshipTypes();
const ATTRIBUTE_NAME = getStringValidator('ATTRIBUTE_NAME');

const arrayToRegExp = arr => new RegExp(`^(${arr.join('|')})$`);
const validStringPatternsRX = arrayToRegExp(Object.keys(stringPatterns));
const validEnums = Object.keys(enums);
const isRichRelationshipType = type => 'from' in type && 'to' in type;

const getTwinnedRelationship = (
	homeTypeName,
	awayTypeName,
	relationshipName,
	homeDirection,
) => {
	const awayType = sdk.rawData
		.getTypes()
		.find(({ name }) => name === awayTypeName);
	return Object.values(awayType.properties).find(
		({ relationship, type, direction }) =>
			relationship === relationshipName &&
			type === homeTypeName &&
			direction !== homeDirection,
	);
};

const propertyTestSuite = ({ typeName, properties, fieldsets }) => {
	const typeNames = sdk.getTypes().map(({ name }) => name);
	const relationshipTypeNames = sdk
		.getRelationshipTypes()
		.map(({ name }) => name);
	const declaredTypeNames = [].concat(typeNames, relationshipTypeNames);

	const validPropTypes = validEnums.concat(
		Object.keys(primitiveTypesMap),
		declaredTypeNames,
	);
	const validFieldsetNames = fieldsets
		? ['self'].concat(Object.keys(fieldsets))
		: [];

	Object.entries(properties).forEach(([name, config]) => {
		describe(`${name}`, () => {
			it('has no unrecognised properties in its config', () => {
				Object.keys(config).forEach(key => {
					const commonKeys = [
						'type',
						'description',
						'label',
						'deprecationReason',
						'hasMany',
						'lockedBy',
					];
					if (fieldsets) {
						commonKeys.push('fieldset');
					}
					if (declaredTypeNames.includes(config.type)) {
						// it's a relationship
						expect(key).toMatch(
							arrayToRegExp(
								commonKeys.concat([
									'direction',
									'relationship',
									'useInSummary',
									'hidden',
									'cypher',
									'autoPopulated',
									'showInactive',
									'writeInactive',
								]),
							),
						);
					} else {
						expect(key).toMatch(
							arrayToRegExp(
								commonKeys.concat([
									'unique',
									'required',
									'canIdentify',
									'useInSummary',
									'autoPopulated',
									'pattern',
									'examples',
									'trueLabel',
									'falseLabel',
								]),
							),
						);
					}
				});
			});

			it('has valid name', () => {
				if (name !== 'SF_ID') {
					expect(name).toMatch(ATTRIBUTE_NAME);
				}
			});

			it("is not named 'type'", () => {
				expect(name).not.toEqual('type');
			});

			it('has valid label', () => {
				expect(typeof config.label).toBe('string');
				expect(/[.!]$/.test(config.label.trim())).toBe(false);
			});
			it('has valid description', () => {
				expect(typeof config.description).toBe('string');
				expect(/[.?]$/.test(config.description.trim())).toBe(true);
			});
			it('has valid markdown formatted description', () => {
				if (config.description.indexOf('\n') > -1) {
					config.description.split('\n').map(oneLine => expect(oneLine.length).toBeLessThanOrEqual(80));
				}
			});
			it('has valid type', () => {
				expect(config.type).toBeDefined();
				expect(config.type).toMatch(arrayToRegExp(validPropTypes));
			});

			it('has valid fieldset', () => {
				if (config.fieldset) {
					expect(validFieldsetNames).toContain(config.fieldset);
				}
			});

			it('has valid deprecation reason', () => {
				if (config.deprecationReason) {
					expect(typeof config.deprecationReason).toBe('string');
					expect(config.deprecationReason).not.toMatch(/\n/);
				}
			});

			it('has valid lockedBy entry', () => {
				if (config.lockedBy) {
					expect(Array.isArray(config.lockedBy)).toBe(true);
					config.lockedBy.forEach(clientId =>
						expect(typeof clientId).toBe('string'),
					);
				}
			});

			// property is rich relationship
			if (relationshipTypeNames.includes(config.type)) {
				describe('relationship property', () => {
					it('should not define relationship related fields', () => {
						['relationship', 'hasMany', 'pattern'].forEach(field =>
							expect(config[field]).not.toBeDefined(),
						);
					});
					it('may have direction', () => {
						if (config.direction) {
							expect(config.direction).toMatch(
								/^incoming|outgoing$/,
							);
						}
					});
					it('can determine relationship direction explicitly', () => {
						const relType = relationshipTypes.find(
							rel => rel.name === config.type,
						);

						expect(relType).toBeDefined();
						if (relType.from.type === relType.to.type) {
							expect(config.direction).toBeDefined();
						}
					});
				});
			} else if (typeNames.includes(config.type)) {
				const RELATIONSHIP_NAME = getStringValidator(
					'RELATIONSHIP_NAME',
				);
				describe('relationship property', () => {
					it('must specify underlying relationship', () => {
						expect(config.relationship).toMatch(RELATIONSHIP_NAME);
					});
					it('must specify direction', () => {
						expect(config.direction).toMatch(/^incoming|outgoing$/);
					});
					it('may be hidden', () => {
						if (config.hidden) {
							expect(config.hidden).toBe(true);
						}
					});

					it('may have many', () => {
						if (config.hasMany) {
							expect(config.hasMany).toBe(true);
						}
					});
					it('may have cypher', () => {
						if (config.cypher) {
							expect(typeof config.cypher).toBe('string');
						}
					});
					it('is defined at both ends', () => {
						expect(
							getTwinnedRelationship(
								typeName,
								config.type,
								config.relationship,
								config.direction,
							),
						).toBeDefined();
					});
				});
			} else {
				describe('direct property', () => {
					it('may be required', () => {
						if (config.required) {
							expect(config.required).toBe(true);
						}
					});
					it('may be an identifier', () => {
						if (config.canIdentify) {
							expect(config.canIdentify).toBe(true);
						}
					});
					it('may define a pattern', () => {
						if (config.pattern) {
							expect(config.pattern).toMatch(
								validStringPatternsRX,
							);
						}
					});

					it('may hide inactive records', () => {
						if (config.showInactive) {
							expect(typeof config.showInactive).toBe('boolean');
						}
					});

					it('may allow writing of inactive records', () => {
						if (config.writeInactive) {
							expect(typeof config.writeInactive).toBe('boolean');
						}
					});

					it('may define true and false labels', () => {
						if (config.trueLabel || config.falseLabel) {
							expect(typeof config.trueLabel).toBe('string');
							expect(typeof config.falseLabel).toBe('string');
							expect(config.type).toBe('Boolean');
						}
					});

					it('may define examples', () => {
						if (config.examples) {
							expect(Array.isArray(config.examples)).toBe(true);
						}
					});
					it('may allow many enums', () => {
						if (config.hasMany) {
							expect(
								[...validEnums],
								// .concat('Word')
							).toContain(config.type);
						}
					});
				});
			}
		});
	});
};

const fieldsetTestSuite = fieldsets => {
	describe('fieldsets', () => {
		it('is an object if it exists', () => {
			expect(typeof fieldsets).toBe('object');
		});
		Object.entries(fieldsets).forEach(([name, fieldsetConfig]) => {
			describe(`${name}`, () => {
				it('has a heading', () => {
					expect(typeof fieldsetConfig.heading).toBe('string');
				});
				it('is not miscellaneous', () => {
					expect(fieldsetConfig.heading).not.toBe('Miscellaneous');
					expect(fieldsetConfig.heading).not.toBe('General');
					expect(name).not.toBe('misc');
				});
				it('may have a description', () => {
					if ('description' in fieldsetConfig) {
						expect(typeof fieldsetConfig.description).toBe(
							'string',
						);
					}
				});
			});
		});
	});
};

const typeTestSuite = type => {
	describe(`${type.name} as Type`, () => {
		it('has no unrecognised properties', () => {
			Object.keys(type).forEach(key => {
				expect(key).toMatch(
					arrayToRegExp([
						'name',
						'description',
						'moreInformation',
						'pluralName',
						'creationURL',
						'fieldsets',
						'properties',
						'createPermissions',
						'minimumViableRecord',
						'inactiveRule',
					]),
				);
			});
		});
		it('has a name', () => {
			expect(typeof type.name).toBe('string');
		});
		it('has a description', () => {
			expect(typeof type.description).toBe('string');
		});
		it('may have a moreInformation', () => {
			if ('moreInformation' in type) {
				expect(typeof type.moreInformation).toBe('string');
			}
		});

		it('may have a createPermissions', () => {
			if ('createPermissions' in type) {
				expect(Array.isArray(type.createPermissions)).toBe(true);
				type.createPermissions.forEach(systemCode => {
					expect(typeof systemCode).toBe('string');
				});
			}
		});

		it('may have a minimumViableRecord', () => {
			if ('minimumViableRecord' in type) {
				expect(Array.isArray(type.minimumViableRecord)).toBe(true);
				type.minimumViableRecord.forEach(propertyName => {
					expect(typeof propertyName).toBe('string');
					expect(type.properties[propertyName]).toBeDefined();
				});
			}
		});

		it('may have an inactiveRule', () => {
			if ('inactiveRule' in type) {
				expect(typeof type.inactiveRule).toBe('object');
			}
		});
		it('may have a plural name', () => {
			if ('pluralName' in type) {
				expect(typeof type.pluralName).toBe('string');
				expect(type.pluralName).not.toEqual(type.name);
			}
		});
		it('may have a creation URL', () => {
			if ('creationURL' in type) {
				expect(typeof type.creationURL).toBe('string');
				expect(validURL.isUri(type.creationURL)).toBeTruthy();
			}
		});
		const { fieldsets } = type;

		if (fieldsets) {
			fieldsetTestSuite(fieldsets);
		}

		describe('properties', () => {
			it('has a code that can identify', () => {
				expect(type.properties.code).toBeDefined();
				expect(type.properties.code.canIdentify).toEqual(true);
			});

			it('has a code that respects a pattern', () => {
				expect(type.properties.code.pattern).toBeDefined();
			});

			propertyTestSuite({
				typeName: type.name,
				properties: type.properties,
				fieldsets,
			});
		});
	});
};

const relationshipTestSuite = type => {
	describe(`${type.name} as Relationship`, () => {
		it('has no unrecognised fields', () => {
			Object.keys(type).forEach(key => {
				expect(key).toMatch(
					arrayToRegExp([
						'name',
						'properties',
						'from',
						'to',
						'isMutual',
						'relationship',
					]),
				);
			});
		});
		it('has from direction', () => {
			expect(type.from).toMatchObject({
				type: expect.any(String),
				hasMany: expect.any(Boolean),
			});
		});
		it('has to direction', () => {
			expect(type.to).toMatchObject({
				type: expect.any(String),
				hasMany: expect.any(Boolean),
			});
		});
		it('has a name', () => {
			expect(typeof type.name).toBe('string');
		});
		it('may have a isMutual', () => {
			if ('isMutual' in type) {
				expect(typeof type.isMutual).toBe('boolean');
				expect(type.from.type === type.to.type).toBe(true);
			}
		});

		const types = sdk.rawData.getTypes();
		const { properties = {}, from, to } = type;

		propertyTestSuite({
			typeName: type.name,
			properties,
		});

		describe('relationship endpoints', () => {
			it('uses existing record type fro from', () => {
				const fromType = types.find(t => t.name === from.type);
				expect(fromType).toBeDefined();
				// assert the relationship node doesn't have more relationship
				expect(isRichRelationshipType(fromType)).toBe(false);
			});

			it('uses existing record type for to', () => {
				const toType = types.find(t => t.name === to.type);
				expect(toType).toBeDefined();
				// assert the relationship node doesn't have more relationship
				expect(isRichRelationshipType(toType)).toBe(false);
			});

			if (from.type !== to.type) {
				it('from type makes use of this relationship type', () => {
					const endType = types.find(t => t.name === to.type);
					const propertiesUsingRelationshipType = Object.values(
						endType.properties,
					).filter(prop => prop.type === type.name);
					expect(propertiesUsingRelationshipType.length).toBe(1);
				});
				it('to type makes use of this relationship type', () => {
					const endType = types.find(t => t.name === from.type);
					const propertiesUsingRelationshipType = Object.values(
						endType.properties,
					).filter(prop => prop.type === type.name);
					expect(propertiesUsingRelationshipType.length).toBe(1);
				});
			} else {
				it('has deterministic direction', () => {
					const typeDef = types.find(t => t.name === from.type);
					const propertiesUsingRelationshipType = Object.values(
						typeDef.properties,
					).filter(prop => prop.type === type.name);

					expect(propertiesUsingRelationshipType.length).toBe(2);
					const startRel = propertiesUsingRelationshipType.find(
						prop => prop.direction === 'outgoing',
					);
					expect(startRel).toBeDefined();
					const endRel = propertiesUsingRelationshipType.find(
						prop => prop.direction === 'incoming',
					);
					expect(endRel).toBeDefined();
				});
			}
		});
	});
};

module.exports = {
	typeTestSuite,
	relationshipTestSuite,
};
