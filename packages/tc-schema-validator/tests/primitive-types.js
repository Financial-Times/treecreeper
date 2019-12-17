/* global it, describe, expect */
const { SDK } = require('@financial-times/tc-schema-sdk');

const primitiveTypes = new SDK().rawData.getPrimitiveTypes();

describe('primitive types', () => {
	Object.entries(primitiveTypes).forEach(([name, { component, graphql }]) => {
		describe(`${name}`, () => {
			it('has a component', () => {
				expect(typeof component).toBe('string');
				expect(component.charAt(0)).toEqual(
					component.charAt(0).toUpperCase(),
				);
			});
			it('has a graphql scalar type', () => {
				expect(typeof graphql).toBe('string');
				expect(
					[
						'String',
						'Date',
						'Time',
						'DateTime',
						'Int',
						'Float',
						'Boolean',
					].includes(graphql),
				).toBe(true);
			});
		});
	});
});
