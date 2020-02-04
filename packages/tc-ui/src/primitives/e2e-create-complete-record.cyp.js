const {
	code,
	someDocument,
	anotherDocument,
	someString,
	someEnum,
	someInteger,
	anotherString,
	someUrl,
	promptText,
} = require('../../../../cypress/fixtures/mainTypeData.json');
const {
	populateMinimumViableFields,
	populateNonMinimumViableFields,
	save,
	resetDb,
} = require('../test-helpers');

describe('End-to-end - record creation', () => {
	beforeEach(() => {
		resetDb();
	});

	it('can create MainType record', () => {
		populateMinimumViableFields(code);
		save();
		populateNonMinimumViableFields(code);
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-first-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);
		cy.get('#someDocument').should('have.text', someDocument);
		cy.get('#anotherDocument').should('have.text', anotherDocument);
		cy.get('#someBoolean').should('have.text', 'Yes');
		cy.get('#someEnum').should('have.text', someEnum);
		cy.get('#someMultipleChoice span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#someMultipleChoice span:last-child').should(
			'have.text',
			'Third',
		);
		cy.get('#someInteger').should('have.text', String(someInteger));
		cy.get('#anotherString').should('have.text', anotherString);
		cy.get('#someDate').should('have.text', '15 January 2020');
		cy.get('#someDatetime').should(
			'have.text',
			'15 January 2020, 1:00:00 PM',
		);
		cy.get('#someUrl')
			.should('have.text', someUrl)
			.should('have.attr', 'href', someUrl);
	});

	it('can not create record if no code(label) is given', () => {
		cy.visit(`/MainType/create`, {
			onBeforeLoad(win) {
				cy.stub(win, 'prompt');
			},
		});
		save();
		// required field
		cy.get('input:invalid').should('have.length', 1);
	});

	it('can not create record if description is not given', () => {
		cy.visit(`/MainType/create`, {
			onBeforeLoad(win) {
				cy.stub(win, 'prompt');
			},
		});

		cy.get('#id-code').type(code);
		save();

		cy.window()
			.its('prompt')
			.should('called', 1);
		cy.window()
			.its('prompt.args.0')
			.should('deep.eq', [promptText]);
	});

	it('can not create record if child record is not selected', () => {
		cy.visit(`/MainType/create`, {
			onBeforeLoad(win) {
				cy.stub(win, 'prompt');
			},
		});

		cy.get('#id-code').type(code);
		cy.get('#id-someString').type(someString);
		save();

		cy.window()
			.its('prompt')
			.should('called', 1);
		cy.window()
			.its('prompt.args.0')
			.should('deep.eq', [promptText]);
	});

	it('can create record with incomplete fields with "SAVE INCOMPLETE RECORD" option', () => {
		cy.visit(`/MainType/create`, {
			onBeforeLoad(win) {
				cy.stub(win, 'prompt').returns('SAVE INCOMPLETE RECORD');
			},
		});

		cy.get('#id-code').type(code);
		save();
		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('be.empty');
		cy.get('#children').should('not.exist');
	});
});
