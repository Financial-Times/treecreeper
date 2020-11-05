const {
	code,
	someDatetime,
	someDate,
} = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitMainTypePage,
	visitEditPage,
	save,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record Temporal type', () => {
	beforeEach(() => {
		cy.wrap(createType({ code, type: 'MainType' })).then(() => {
			visitMainTypePage();
			visitEditPage();
		});
	});

	it('can record time', () => {
		cy.get('input[name=someTime]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val('12:15:30');
			})
			.click();
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someTime').should('have.text', '12:15:30 PM');
		cy.get('[data-button-type="edit"]').click({
			force: true,
		});
		cy.get('input[name=someTime]').should('have.value', '12:15:30');
		save();
		cy.get('#code').should('have.text', code);
		cy.get('#someTime').should('have.text', '12:15:30 PM');
		visitEditPage();
		cy.get('input[name=someTime]').should('have.value', '12:15:30');
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
		cy.get('#someDate').should('have.text', '15 January 2020');
		cy.get('[data-button-type="edit"]').click({
			force: true,
		});
		cy.get('input[name=someDate]').should('have.value', '2020-01-15');
		save();
		cy.get('#code').should('have.text', code);
		cy.get('#someDate').should('have.text', '15 January 2020');
		visitEditPage();
		cy.get('input[name=someDate]').should('have.value', '2020-01-15');
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
		cy.get('#someDatetime').should(
			'have.text',
			'15 January 2020, 1:00:00 PM',
		);
		cy.get('[data-button-type="edit"]').click({
			force: true,
		});
		cy.get('input[name=someDatetime]').should(
			'have.value',
			'2020-01-15T13:00:00.000',
		);
		save();
		cy.get('#code').should('have.text', code);
		cy.get('#someDatetime').should(
			'have.text',
			'15 January 2020, 1:00:00 PM',
		);
		visitEditPage();
		cy.get('input[name=someDatetime]').should(
			'have.value',
			'2020-01-15T13:00:00.000',
		);
	});
});
