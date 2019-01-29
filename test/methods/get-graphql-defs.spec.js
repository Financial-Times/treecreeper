const generateGraphqlDefs = require('../..').getGraphqlDefs;
const rawData = require('../../lib/raw-data');
const cache = require('../../lib/cache');
const primitiveTypesMap = require('../../lib/primitive-types-map');

const explodeString = str =>
	str
		.split('\n')
		// exclude strings which are just whitespace or empty
		.filter(string => !/^[\s]*$/.test(string))
		.map(string => string.trim());

describe('graphql def creation', () => {
	beforeEach(() => {
		cache.clear();
		jest.spyOn(rawData, 'getTypes');
		jest.spyOn(rawData, 'getEnums');
	});

	afterEach(() => {
		cache.clear();
		jest.restoreAllMocks();
	});

	it('generates expected graphql def given schema', () => {
		rawData.getTypes.mockReturnValue([
			{
				name: 'CostCentre',
				description: 'A cost centre which groups are costed to',
				properties: {
					code: {
						type: 'Word',
						required: true,
						unique: true,
						canIdentify: true,
						description: 'Unique code/id for this item',
						pattern: 'COST_CENTRE',
					},
					name: {
						type: 'Word',
						canIdentify: true,
						description: 'The name of the cost centre',
					},
					hasGroups: {
						type: 'Group',
						relationship: 'PAYS_FOR',
						direction: 'outgoing',
						hasMany: true,
						description:
							'The groups which are costed to the cost centre',
					},
					hasNestedGroups: {
						type: 'Group',
						relationship: 'PAYS_FOR',
						direction: 'outgoing',
						hasMany: true,
						isRecursive: true,
						description:
							'The recursive groups which are costed to the cost centre',
					},
				},
			},
			{
				name: 'Group',
				description:
					'An overarching group which contains teams and is costed separately',
				properties: {
					code: {
						type: 'Word',
						required: true,
						unique: true,
						canIdentify: true,
						description: 'Unique code/id for this item',
						pattern: 'COST_CENTRE',
					},
					name: {
						type: 'Word',
						canIdentify: true,
						description: 'The name of the group',
					},
					isActive: {
						type: 'Boolean',
						canFilter: true,
						description:
							'Whether or not the group is still in existence',
					},
					hasBudget: {
						type: 'CostCentre',
						relationship: 'PAYS_FOR',
						direction: 'incoming',
						description:
							'The Cost Centre associated with the group',
					},
					hasEventualBudget: {
						type: 'CostCentre',
						description:
							'The Cost Centre associated with the group in the end',
						isRecursive: true,
						relationship: 'PAYS_FOR',
						direction: 'incoming',
					},
				},
			},
		]);

		rawData.getEnums.mockReturnValue({
			Lifecycle: {
				description: 'The lifecycle stage of a product',
				options: ['Incubate', 'Sustain', 'Grow', 'Sunset'],
			},
		});

		const generated = [].concat(
			...generateGraphqlDefs().map(explodeString),
		);

		expect(generated).toEqual(
			explodeString(
				`
scalar DateTime
scalar Date
scalar Time
# A cost centre which groups are costed to
type CostCentre {

# Unique code/id for this item
code: String
# The name of the cost centre
name: String
# The groups which are costed to the cost centre
hasGroups(first: Int, offset: Int): [Group] @relation(name: "PAYS_FOR", direction: "OUT")
# The recursive groups which are costed to the cost centre
hasNestedGroups(first: Int, offset: Int): [Group] @cypher(
statement: "MATCH (this)-[:PAYS_FOR*1..20]->(related:Group) RETURN DISTINCT related"
)

# The client that was used to make the creation
_createdByClient: String
# The user that made the creation
_createdByUser: String
# The time and date this record was created
_createdTimestamp: DateTime
# The client that was used to make the update
_updatedByClient: String
# The last user to make an update
_updatedByUser: String
# The time and date this record was last updated
_updatedTimestamp: DateTime

},

# An overarching group which contains teams and is costed separately
type Group {

# Unique code/id for this item
code: String
# The name of the group
name: String
# Whether or not the group is still in existence
isActive: Boolean

# The Cost Centre associated with the group
hasBudget: CostCentre @relation(name: "PAYS_FOR", direction: "IN")
# The Cost Centre associated with the group in the end
hasEventualBudget: CostCentre @cypher(
statement: "MATCH (this)<-[:PAYS_FOR*1..20]-(related:CostCentre) RETURN DISTINCT related"
)

# The client that was used to make the creation
_createdByClient: String
# The user that made the creation
_createdByUser: String
# The time and date this record was created
_createdTimestamp: DateTime
# The client that was used to make the update
_updatedByClient: String
# The last user to make an update
_updatedByUser: String
# The time and date this record was last updated
_updatedTimestamp: DateTime

}
type Query {
CostCentre(

# Unique code/id for this item
code: String
# The name of the cost centre
name: String
): CostCentre

CostCentres(

# The pagination offset to use
offset: Int = 0
# The number of records to return after the pagination offset. This uses the default neo4j ordering
first: Int = 20000
# Unique code/id for this item
code: String
# The name of the cost centre
name: String

# The client that was used to make the creation
_createdByClient: String
# The user that made the creation
_createdByUser: String
# The time and date this record was created
_createdTimestamp: DateTime
# The client that was used to make the update
_updatedByClient: String
# The last user to make an update
_updatedByUser: String
# The time and date this record was last updated
_updatedTimestamp: DateTime
): [CostCentre]

Group(

# Unique code/id for this item
code: String
# The name of the group
name: String
): Group

Groups(

# The pagination offset to use
offset: Int = 0
# The number of records to return after the pagination offset. This uses the default neo4j ordering
first: Int = 20000
# Unique code/id for this item
code: String
# The name of the group
name: String
# Whether or not the group is still in existence
isActive: Boolean
# The client that was used to make the creation
_createdByClient: String
# The user that made the creation
_createdByUser: String
# The time and date this record was created
_createdTimestamp: DateTime
# The client that was used to make the update
_updatedByClient: String
# The last user to make an update
_updatedByUser: String
# The time and date this record was last updated
_updatedTimestamp: DateTime
): [Group]
}
# The lifecycle stage of a product
enum Lifecycle {
Incubate
Sustain
Grow
Sunset
}`,
			),
		);
	});

	it('Multiline descriptions', () => {
		rawData.getTypes.mockReturnValue([
			{
				name: 'Dummy',
				description: 'dummy type description',
				properties: {
					prop: {
						type: 'Boolean',
						description: 'a description\nmultiline',
					},
				},
			},
		]);
		rawData.getEnums.mockReturnValue({
			AnEnum: {
				name: 'DummyEnum',
				description: 'an enum description\nmultiline',
				options: ['One', 'Two'],
			},
		});
		const generated = [].concat(...generateGraphqlDefs()).join('');
		// note the regex has a space, not a new line
		expect(generated).toMatch(/a description multiline/);
		expect(generated).toMatch(/an enum description multiline/);
	});

	describe('deprecation', () => {
		it('can deprecate a property', () => {
			rawData.getTypes.mockReturnValue([
				{
					name: 'Dummy',
					description: 'dummy type description',
					properties: {
						prop: {
							type: 'Boolean',
							deprecationReason: 'not needed',
							description: 'a description',
						},
					},
				},
			]);
			rawData.getEnums.mockReturnValue({});
			const generated = [].concat(...generateGraphqlDefs()).join('');
			// note the regex has a space, not a new line
			expect(generated).toContain(
				'prop: Boolean  @deprecated(reason: "not needed")',
			);
		});

		it('can deprecate a relationship property', () => {
			rawData.getTypes.mockReturnValue([
				{
					name: 'Dummy',
					description: 'dummy type description',
					properties: {
						prop: {
							type: 'Boolean',
							deprecationReason: 'not needed',
							description: 'a description',
							relationship: 'HAS',
							direction: 'outgoing',
							hasMany: true,
						},
					},
				},
			]);
			rawData.getEnums.mockReturnValue({});
			const generated = [].concat(...generateGraphqlDefs()).join('');
			// note the regex has a space, not a new line
			expect(generated).toContain(
				'prop(first: Int, offset: Int): [Boolean] @relation(name: "HAS", direction: "OUT") @deprecated(reason: "not needed")',
			);
		});
	});

	describe('converting types', () => {
		Object.entries(primitiveTypesMap).forEach(
			([bizopsType, graphqlType]) => {
				if (bizopsType === 'Document') {
					it(`Does not expose Document properties`, () => {
						rawData.getTypes.mockReturnValue([
							{
								name: 'Dummy',
								description: 'dummy type description',
								properties: {
									prop: {
										type: 'Document',
										description: 'a description',
									},
								},
							},
						]);
						rawData.getEnums.mockReturnValue({});
						const generated = []
							.concat(...generateGraphqlDefs())
							.join('');

						expect(generated).not.toMatch(
							new RegExp(`prop: String`),
						);
					});
				} else {
					it(`Outputs correct type for properties using ${bizopsType}`, () => {
						rawData.getTypes.mockReturnValue([
							{
								name: 'Dummy',
								description: 'dummy type description',
								properties: {
									prop: {
										type: bizopsType,
										description: 'a description',
									},
								},
							},
						]);
						rawData.getEnums.mockReturnValue({});
						const generated = []
							.concat(...generateGraphqlDefs())
							.join('');

						expect(generated).toMatch(
							new RegExp(`prop: ${graphqlType}`),
						);
					});
				}
			},
		);
	});
});
