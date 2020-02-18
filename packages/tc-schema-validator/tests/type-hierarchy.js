/* global it, describe, expect */
const { SDK, readYaml } = require('@financial-times/tc-schema-sdk');

const { rawData } = new SDK({ readYaml });

const typeHierarchy = rawData.getTypeHierarchy();

const rawTypes = readYaml.directory(
	process.env.TREECREEPER_SCHEMA_DIRECTORY,
	'types',
);

if (typeHierarchy) {
	describe('type hierarchy', () => {
		it('should be an object', () => {
			expect(typeof typeHierarchy).toBe('object');
			expect(Array.isArray(typeHierarchy)).toBe(false);
		});

		Object.entries(typeHierarchy).forEach(([category, def]) => {
			describe(`${category} category`, () => {
				it('should have a label', () => {
					expect(typeof def.label).toBe('string');
				});

				it('should have a description', () => {
					expect(typeof def.description).toBe('string');
				});

				it('should have an array of types', () => {
					expect(Array.isArray(def.types)).toBe(true);
					expect(def.types.length).toBeGreaterThan(0);
					def.types.forEach(type => {
						expect(typeof type).toBe('string');
					});
				});

				it('should not contain any unknown types', () => {
					def.types.forEach(type => {
						expect(rawTypes.some(({ name }) => name === type)).toBe(
							true,
						);
					});
				});
			});
		});

		it('should contain all types exactly once	', () => {
			const categories = Object.values(typeHierarchy);
			rawTypes.forEach(({ name }) => {
				expect(
					categories.some(({ types }) => types.includes(name)),
				).toBe(true);
			});
		});
	});
}
