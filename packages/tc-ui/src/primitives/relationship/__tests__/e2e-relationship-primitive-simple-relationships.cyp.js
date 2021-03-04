const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-simple-relationship-primitive';
const codeMany1 = `${namespace}-many1`;
const codeMany2 = `${namespace}-many2`;
const codeMany3 = `${namespace}-many3`;
const codeOne1 = `${namespace}-one1`;
const codeOne2 = `${namespace}-one2`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

const getPicker = () => cy.get('#simpleRelationship-picker');

const search = term => getPicker().type(term).wait(500);

const assertSelected = (...texts) => {
	cy.get('#ul-simpleRelationship')
		.children()
		.should('have.lengthOf', texts.length);
	texts.forEach((text, i) => {
		cy.get('#ul-simpleRelationship')
			.children()
			.eq(i)
			.find('.o-layout-typography')
			.should('have.text', text);
	});
};

const createRecords = () =>
	executeQuery(`
			CREATE (a:RelationshipTestsMany),
				(b:RelationshipTestsMany),
				(c:RelationshipTestsMany),
				(d:RelationshipTestsOne),
				(e:RelationshipTestsOne)
			SET a = {code: "${codeMany1}", name: "Many 1"}
			SET b = {code: "${codeMany2}", name: "Many 2"}
			SET c = {code: "${codeMany3}", name: "Many 3"}
			SET d = {code: "${codeOne1}"}
			SET e = {code: "${codeOne2}"}
			RETURN a, b, c, d, e
`);

const detachFixtures = () =>
	executeQuery(`
	MATCH (n)-[r]-() WHERE n.code STARTS WITH "${namespace}" DELETE r
`);

describe('End-to-end - Rich relationship primitive; simple relationships', () => {
	before(() => {
		cy.wrap(dropFixtures(namespace));
		cy.wrap(createRecords());
	});
	afterEach(() => cy.wrap(detachFixtures()));
	after(() => {
		cy.wrap(dropFixtures(namespace));
	});

	describe('empty state', () => {
		it.skip('view empty state', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}`);
			cy.get('#simpleRelationship').should('have.text', 'Unknown');
		});

		it('edit empty state', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			cy.get('#id-simpleRelationship').should('have.value', '[]');
			cy.get('#ul-simpleRelationship')
				.children()
				.should('have.lengthOf', 0);
		});
	});

	describe('autocomplete', () => {
		const getSuggestions = () =>
			cy
				.get(
					'[for="id-simpleRelationship"] .react-autosuggest__suggestions-container [role="listbox"]',
				)
				.children();
		it('does not search based on single character', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			search('e');

			cy.get(
				'[for="id-simpleRelationship"] .react-autosuggest__suggestions-container',
			)
				.children()
				.should('have.lengthOf', 0);
		});
		it('handles no result sensibly', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			search('adadsad');

			cy.get(
				'[for="id-simpleRelationship"] .react-autosuggest__suggestions-container',
			)
				.children()
				.should('have.lengthOf', 0);
		});
		it('shows name and code in search drop down', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			search('e2e');

			cy.get(
				'[for="id-simpleRelationship"] .react-autosuggest__suggestions-container',
			).should('have.lengthOf', 1);

			getSuggestions().should('have.lengthOf', 3);
			getSuggestions()
				.eq(0)
				.should(
					'have.text',
					'Many 1 (e2e-simple-relationship-primitive-many1)',
				);
			getSuggestions()
				.eq(1)
				.should(
					'have.text',
					'Many 2 (e2e-simple-relationship-primitive-many2)',
				);
			getSuggestions()
				.eq(2)
				.should(
					'have.text',
					'Many 3 (e2e-simple-relationship-primitive-many3)',
				);
		});

		it('does not suggest previously selected records', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			search('e2e').type('{downarrow}{enter}').should('not.be.disabled');
			getPicker().should('have.value', '');
			assertSelected('Many 1');
			search('e2e');
			getSuggestions().should('have.lengthOf', 2);
			getSuggestions()
				.eq(0)
				.should(
					'have.text',
					'Many 2 (e2e-simple-relationship-primitive-many2)',
				);
			getSuggestions()
				.eq(1)
				.should(
					'have.text',
					'Many 3 (e2e-simple-relationship-primitive-many3)',
				);
		});
	});

	describe('__-to-many relationships', () => {
		it('find and add a relationship', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			search('e2e').type('{downarrow}{enter}').should('not.be.disabled');
			getPicker().should('have.value', '');
			assertSelected('Many 1');
			save();
			cy.get('#simpleRelationship').children().should('have.lengthOf', 1);
			cy.get('#simpleRelationship')
				.children()
				.first()
				.find('a')
				.should('have.text', 'Many 1');
			cy.get('#simpleRelationship')
				.children()
				.first()
				.find('a')
				.should(
					'have.attr',
					'href',
					`/RelationshipTestsMany/${codeMany1}`,
				);
		});

		it('find and add multiple relationships', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			search('e2e').type('{downarrow}{enter}').should('not.be.disabled');
			search('e2e')
				.type('{downarrow}{downarrow}{enter}')
				.should('not.be.disabled');
			assertSelected('Many 1', 'Many 3');
			save();
			cy.get('#simpleRelationship').children().should('have.lengthOf', 2);
			cy.get('#simpleRelationship')
				.children()
				.eq(0)
				.find('a')
				.should('have.text', 'Many 1');
			cy.get('#simpleRelationship')
				.children()
				.eq(0)
				.find('a')
				.should(
					'have.attr',
					'href',
					`/RelationshipTestsMany/${codeMany1}`,
				);
			cy.get('#simpleRelationship')
				.children()
				.eq(1)
				.find('a')
				.should('have.text', 'Many 3');
			cy.get('#simpleRelationship')
				.children()
				.eq(1)
				.find('a')
				.should(
					'have.attr',
					'href',
					`/RelationshipTestsMany/${codeMany3}`,
				);
		});

		it('display multiple and remove first relationship', () => {
			cy.wrap(
				executeQuery(`
MATCH (a:RelationshipTestsMany), (c:RelationshipTestsOne), (b:RelationshipTestsMany)
WHERE a.code = "${codeMany1}" AND c.code = "${codeOne1}" AND b.code = "${codeMany2}"
WITH a, b, c
MERGE (a)-[r:MANY_TO_ONE]->(c)<-[s:MANY_TO_ONE]-(b)
RETURN a, b, c
`),
			);
			cy.visit(`/RelationshipTestsOne/${codeOne1}`);
			cy.get('#simpleRelationship').children().should('have.lengthOf', 2);
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			cy.get('#ul-simpleRelationship')
				.children()
				.eq(0)
				.find('button')
				.click();
			assertSelected('Many 2');
			save();
			cy.get('#simpleRelationship').children().should('have.lengthOf', 1);
			cy.get('#simpleRelationship')
				.children()
				.eq(0)
				.find('a')
				.should('have.text', 'Many 2');
		});

		it('display multiple and remove last relationship', () => {
			cy.wrap(
				executeQuery(`
MATCH (a:RelationshipTestsMany), (c:RelationshipTestsOne), (b:RelationshipTestsMany)
WHERE a.code = "${codeMany1}" AND c.code = "${codeOne1}" AND b.code = "${codeMany2}"
WITH a, b, c
MERGE (a)-[r:MANY_TO_ONE]->(c)<-[s:MANY_TO_ONE]-(b)
RETURN a, b, c
`),
			);
			cy.visit(`/RelationshipTestsOne/${codeOne1}`);
			cy.get('#simpleRelationship').children().should('have.lengthOf', 2);
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			cy.get('#ul-simpleRelationship')
				.children()
				.eq(1)
				.find('button')
				.click();
			assertSelected('Many 1');
			save();
			cy.get('#simpleRelationship').children().should('have.lengthOf', 1);
			cy.get('#simpleRelationship')
				.children()
				.eq(0)
				.find('a')
				.should('have.text', 'Many 1');
		});

		it('display relationship remove all', () => {
			cy.wrap(
				executeQuery(`
MATCH (a:RelationshipTestsMany), (c:RelationshipTestsOne)
WHERE a.code = "${codeMany1}" AND c.code = "${codeOne1}"
WITH a, c
MERGE (a)-[r:MANY_TO_ONE]->(c)
RETURN a, c
`),
			);
			cy.visit(`/RelationshipTestsOne/${codeOne1}`);
			cy.get('#simpleRelationship').children().should('have.lengthOf', 1);
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			cy.get('#ul-simpleRelationship')
				.children()
				.eq(0)
				.find('button')
				.click();
			assertSelected();
			save();
			cy.get('#simpleRelationship').should('have.lengthOf', 0);
		});
	});

	describe('__-to-one relationships', () => {
		it('Can create a single relationship', () => {
			cy.visit(`/RelationshipTestsMany/${codeMany1}/edit`);
			getPicker().should('not.be.disabled');
			search('e2e').type('{downarrow}{enter}').should('be.disabled');
			getPicker().should('have.value', '');
			assertSelected('e2e-simple-relationship-primitive-one1');
			save();
			cy.get('#simpleRelationship').should('have.lengthOf', 1);
			cy.get('#simpleRelationship')
				// demonstrating that it falls back to code when name not defined on the type
				.should('have.text', 'e2e-simple-relationship-primitive-one1');
			cy.get('#simpleRelationship').should(
				'have.attr',
				'href',
				`/RelationshipTestsOne/${codeOne1}`,
			);
		});

		it('Can remove a single relationship', () => {
			cy.wrap(
				executeQuery(`
MATCH (a:RelationshipTestsMany), (c:RelationshipTestsOne)
WHERE a.code = "${codeMany1}" AND c.code = "${codeOne1}"
WITH a, c
MERGE (a)-[r:MANY_TO_ONE]->(c)
RETURN a, c
`),
			);
			cy.visit(`/RelationshipTestsMany/${codeMany1}/edit`);
			getPicker().should('be.disabled');
			cy.get('#ul-simpleRelationship')
				.children()
				.eq(0)
				.find('button')
				.click();
			assertSelected();

			getPicker().should('not.be.disabled');
			save();
			cy.get('#simpleRelationship').should('have.lengthOf', 0);
		});

		it('Can replace a single relationship', () => {
			cy.wrap(
				executeQuery(`
MATCH (a:RelationshipTestsMany), (c:RelationshipTestsOne)
WHERE a.code = "${codeMany1}" AND c.code = "${codeOne1}"
WITH a, c
MERGE (a)-[r:MANY_TO_ONE]->(c)
RETURN a, c
`),
			);
			cy.visit(`/RelationshipTestsMany/${codeMany1}/edit`);
			getPicker().should('be.disabled');
			cy.get('#ul-simpleRelationship')
				.children()
				.eq(0)
				.find('button')
				.click();
			assertSelected();
			getPicker().should('not.be.disabled');
			search('e2e')
				.type('{downarrow}{downarrow}{enter}')
				.should('be.disabled');
			getPicker().should('have.value', '');
			assertSelected('e2e-simple-relationship-primitive-one2');
			save();
			cy.get('#simpleRelationship').should('have.lengthOf', 1);
			cy.get('#simpleRelationship')
				// demonstrating that it falls back to code when name not defined on the type
				.should('have.text', 'e2e-simple-relationship-primitive-one2');
			cy.get('#simpleRelationship').should(
				'have.attr',
				'href',
				`/RelationshipTestsOne/${codeOne2}`,
			);
		});
	});
});
