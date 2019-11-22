/* global it, describe, expect */
const validURL = require('valid-url');
const { SDK, primitiveTypesMap } = require('@financial-times/tc-schema-sdk');

const sdk = new SDK();
const { getStringValidator } = sdk;
const enums = sdk.rawData.getEnums();
const stringPatterns = sdk.rawData.getStringPatterns();
const ATTRIBUTE_NAME = getStringValidator('ATTRIBUTE_NAME');

const arrayToRegExp = arr => new RegExp(`^(${arr.join('|')})$`);
const validStringPatternsRX = arrayToRegExp(Object.keys(stringPatterns));
const validEnums = Object.keys(enums);
const isRichRelationshipType = type => 'from' in type && 'to' in type;

const propertyTestSuite = ({ typeNames, properties, fieldsets }) => {
	const validPropTypes = validEnums.concat(
		Object.keys(primitiveTypesMap),
		typeNames,
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
					];
					if (fieldsets) {
						commonKeys.push('fieldset');
					}
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
								'direction',
							]),
						),
					);
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

			if (!typeNames.includes(config.type)) {
				describe('direct property', () => {
					// tests for direct properties
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

const typeTestSuite = (types, type) => {
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
				typeNames: types.map(({ name }) => name),
				properties: type.properties,
				fieldsets,
			});
		});
	});
};

const relationshipTestSuite = (types, type) => {
	describe(`${type.name} as Relationship`, () => {
		it('has no unrecognised fields', () => {
			Object.keys(type).forEach(key => {
				expect(key).toMatch(
					arrayToRegExp([
						'name',
						'properties',
						'from',
						'to',
						'isMutal',
						'relationship',
					]),
				);
			});
		});
		it('has a name', () => {
			expect(typeof type.name).toBe('string');
		});
		it('has an exact from relationship', () => {
			expect(type.from).toMatchObject({
				type: expect.any(String),
				hasMany: expect.any(Boolean),
			});
		});
		it('has an exact to relationship', () => {
			expect(type.to).toMatchObject({
				type: expect.any(String),
				hasMany: expect.any(Boolean),
			});
		});
		it('may have a isMutal', () => {
			if ('isMutal' in type) {
				expect(typeof type.isMutal).toBe('boolean');
			}
		});

		const typeNames = types.map(({ name }) => name);
		const { properties = {}, from, to } = type;

		propertyTestSuite({
			typeNames,
			properties,
		});

		if (from) {
			describe('from', () => {
				it('has existing type', () => {
					const fromType = types.find(t => t.name === from.type);
					expect(fromType).not.toBeNull();
					// assert the relationship node doesn't have more relationship
					expect(isRichRelationshipType(fromType)).toBe(false);
				});

				if (!to) {
					// If the relationship doesn't have `to` property,
					// we need to validate if the relationship is end
					it('has relationship of the end', () => {});
				}
			});
		}

		if (to) {
			describe('to', () => {
				it('has existing type', () => {
					const toType = types.find(t => t.name === to.type);
					expect(toType).not.toBeNull();
					// assert the relationship node doesn't have more relationship
					expect(isRichRelationshipType(toType)).toBe(false);
				});
			});
		}

		// TODO: validate twinned relationship ( defined as both ends )
		// const getTwinnedRelationship = (
		// 	homeTypeName,
		// 	awayTypeName,
		// 	relationshipName,
		// 	homeDirection,
		// ) => {
		// 	const awayType = types.find(({ name }) => name === awayTypeName);
		// 	return Object.values(awayType.properties).find(
		// 		({ relationship, type, direction }) =>
		// 			relationship === relationshipName &&
		// 			type === homeTypeName &&
		// 			direction !== homeDirection,
		// 	);
		// };
	});
};

module.exports = {
	typeTestSuite,
	relationshipTestSuite,
};
