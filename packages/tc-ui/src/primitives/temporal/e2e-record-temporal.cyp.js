const {
	code,
	someString,
	someDatetime,
	someDate,
} = require('../../../../../cypress/fixtures/mainTypeData.json');
const {
	populateMinimumViableFields,
	save,
	resetDb,
} = require('../../test-helpers');

describe('End-to-end - record Temporal type', () => {
	beforeEach(() => {
		resetDb();
		populateMinimumViableFields(code);
	});

	it('can record date', () => {
		cy.get('input[name=someDate]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val(someDate);
			})
			.click();
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#someDate').should('have.text', '15 January 2020');
	});

	it('can record date-time', () => {
		cy.get('input[name=someDatetime]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val(someDatetime);
			})
			.click();
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#someDatetime').should(
			'have.text',
			'15 January 2020, 1:00:00 PM',
		);
	});
});