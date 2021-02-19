const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-demo-primitives-multiple-choice';
const code = `${namespace}-code`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

const createRecord = (props = {}) =>
	cy.wrap(
		executeQuery(`CREATE (:KitchenSink $props)`, {
			props: { code, ...props },
		}),
	);

describe('End-to-end - Enum primitive', () => {
	before(() => cy.wrap(dropFixtures(namespace)));
	afterEach(() => cy.wrap(dropFixtures(namespace)));

	// buggy for some reason
	it.skip('view empty state', () => {
		createRecord();
		cy.visit(`/KitchenSink/${code}`);
		cy.get('#multipleChoiceEnumProperty')
			.children()
			.should('have.length', 0);
	});

	it('edit empty state', () => {
		createRecord();
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('#checkbox-multipleChoiceEnumProperty-First')
			.should('have.value', 'First')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
			.should('have.value', 'Second')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
			.should('have.value', 'Third')
			.should('not.be.checked');
	});

	it('can select multiple values', () => {
		createRecord();
		cy.visit(`/KitchenSink/${code}/edit`);

		cy.get('#checkbox-multipleChoiceEnumProperty-First').check({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-Third').check({
			force: true,
		});

		cy.get('#checkbox-multipleChoiceEnumProperty-First')
			.should('have.value', 'First')
			.should('be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
			.should('have.value', 'Second')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
			.should('have.value', 'Third')
			.should('be.checked');
		save();

		cy.get('#multipleChoiceEnumProperty')
			.children()
			.should('have.length', 2);
		cy.get('#multipleChoiceEnumProperty span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#multipleChoiceEnumProperty span:nth-child(2)').should(
			'have.text',
			'Third',
		);
	});

	it('can edit selected values', () => {
		createRecord({ multipleChoiceEnumProperty: ['First', 'Third'] });
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('#checkbox-multipleChoiceEnumProperty-First').uncheck({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-Second').check({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-Third').uncheck({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-First')
			.should('have.value', 'First')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
			.should('have.value', 'Second')
			.should('be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
			.should('have.value', 'Third')
			.should('not.be.checked');
		save();

		cy.get('#multipleChoiceEnumProperty')
			.children()
			.should('have.length', 1);
		cy.get('#multipleChoiceEnumProperty span:first-child').should(
			'have.text',
			'Second',
		);
	});

	it('can deselect all values', () => {
		createRecord({
			multipleChoiceEnumProperty: ['First', 'Second', 'Third'],
		});
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('#checkbox-multipleChoiceEnumProperty-First').uncheck({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-Second').uncheck({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-Third').uncheck({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-First')
			.should('have.value', 'First')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
			.should('have.value', 'Second')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
			.should('have.value', 'Third')
			.should('not.be.checked');
		save();

		cy.get('#multipleChoiceEnumProperty')
			.children()
			.should('have.length', 0);
	});
});

// const { code } = require('../../../test-helpers/mainTypeData.json');
// const {
// 	createType,
// 	visitMainTypePage,
// 	visitEditPage,
// 	save,
// } = require('../../../test-helpers/cypress');

// describe('End-to-end - record multiple choice value', () => {
// 	beforeEach(() => {
// 		cy.wrap(createType({ code, type: 'MainType' })).then(() => {
// 			visitMainTypePage();
// 			visitEditPage();
// 		});
// 	});

// 	it('can record a single choice', () => {
// 		cy.get('#checkbox-multipleChoiceEnumProperty-First').check({ force: true });

// 		cy.get('#checkbox-multipleChoiceEnumProperty-First')
// 			.should('have.value', 'First')
// 			.should('be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
// 			.should('have.value', 'Second')
// 			.should('not.be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
// 			.should('have.value', 'Third')
// 			.should('not.be.checked');
// 		save();

// 		cy.get('#code').should('have.text', code);
// 		cy.get('#multipleChoiceEnumProperty span:first-child').should(
// 			'have.text',
// 			'First',
// 		);
// 		cy.get('#multipleChoiceEnumProperty').children().should('have.length', 1);
// 	});

// 	it('can record multiple choices', () => {
// 		cy.get('#checkbox-multipleChoiceEnumProperty-First').check({ force: true });
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Third').check({ force: true });

// 		cy.get('#checkbox-multipleChoiceEnumProperty-First')
// 			.should('have.value', 'First')
// 			.should('be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
// 			.should('have.value', 'Second')
// 			.should('not.be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
// 			.should('have.value', 'Third')
// 			.should('be.checked');
// 		save();

// 		cy.get('#code').should('have.text', code);
// 		cy.get('#multipleChoiceEnumProperty span:first-child').should(
// 			'have.text',
// 			'First',
// 		);
// 		cy.get('#multipleChoiceEnumProperty span:last-child').should(
// 			'have.text',
// 			'Third',
// 		);
// 		cy.get('#multipleChoiceEnumProperty').children().should('have.length', 2);
// 	});

// 	it('can record all choices', () => {
// 		cy.get('#checkbox-multipleChoiceEnumProperty-First').check({ force: true });
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Second').check({ force: true });
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Third').check({ force: true });

// 		cy.get('#checkbox-multipleChoiceEnumProperty-First')
// 			.should('have.value', 'First')
// 			.should('be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
// 			.should('have.value', 'Second')
// 			.should('be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
// 			.should('have.value', 'Third')
// 			.should('be.checked');
// 		save();

// 		cy.get('#code').should('have.text', code);
// 		cy.get('#multipleChoiceEnumProperty span:first-child').should(
// 			'have.text',
// 			'First',
// 		);
// 		cy.get('#multipleChoiceEnumProperty span:nth-child(2)').should(
// 			'have.text',
// 			'Second',
// 		);
// 		cy.get('#multipleChoiceEnumProperty span:nth-child(3)').should(
// 			'have.text',
// 			'Third',
// 		);
// 		cy.get('#multipleChoiceEnumProperty span:last-child').should(
// 			'have.text',
// 			'Third',
// 		);
// 		cy.get('#multipleChoiceEnumProperty').children().should('have.length', 3);
// 	});

// 	it('can deselect a choice', () => {
// 		cy.get('#checkbox-multipleChoiceEnumProperty-First').check({ force: true });

// 		cy.get('#checkbox-multipleChoiceEnumProperty-First')
// 			.should('have.value', 'First')
// 			.should('be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
// 			.should('have.value', 'Second')
// 			.should('not.be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
// 			.should('have.value', 'Third')
// 			.should('not.be.checked');
// 		save();

// 		cy.get('#code').should('have.text', code);
// 		cy.get('#multipleChoiceEnumProperty span:first-child').should(
// 			'have.text',
// 			'First',
// 		);
// 		cy.get('#multipleChoiceEnumProperty').children().should('have.length', 1);

// 		visitEditPage();
// 		cy.get('#checkbox-multipleChoiceEnumProperty-First').uncheck({ force: true });
// 		cy.get('#checkbox-multipleChoiceEnumProperty-First')
// 			.should('have.value', 'First')
// 			.should('not.be.checked');
// 		save();

// 		cy.get('#multipleChoiceEnumProperty').should('not.exist');
// 	});

// 	it('can deselect all choices', () => {
// 		cy.get('#checkbox-multipleChoiceEnumProperty-First').check({ force: true });
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Second').check({ force: true });
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Third').check({ force: true });

// 		cy.get('#checkbox-multipleChoiceEnumProperty-First')
// 			.should('have.value', 'First')
// 			.should('be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
// 			.should('have.value', 'Second')
// 			.should('be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
// 			.should('have.value', 'Third')
// 			.should('be.checked');
// 		save();

// 		cy.get('#code').should('have.text', code);
// 		cy.get('#multipleChoiceEnumProperty span:first-child').should(
// 			'have.text',
// 			'First',
// 		);
// 		cy.get('#multipleChoiceEnumProperty span:nth-child(2)').should(
// 			'have.text',
// 			'Second',
// 		);
// 		cy.get('#multipleChoiceEnumProperty span:last-child').should(
// 			'have.text',
// 			'Third',
// 		);
// 		cy.get('#multipleChoiceEnumProperty').children().should('have.length', 3);

// 		visitEditPage();
// 		cy.get('#checkbox-multipleChoiceEnumProperty-First').uncheck({ force: true });
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Second').uncheck({ force: true });
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Third').uncheck({ force: true });
// 		cy.get('#checkbox-multipleChoiceEnumProperty-First')
// 			.should('have.value', 'First')
// 			.should('not.be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
// 			.should('have.value', 'Second')
// 			.should('not.be.checked');
// 		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
// 			.should('have.value', 'Third')
// 			.should('not.be.checked');
// 		save();

// 		cy.get('#multipleChoiceEnumProperty').should('not.exist');
// 	});
// });
