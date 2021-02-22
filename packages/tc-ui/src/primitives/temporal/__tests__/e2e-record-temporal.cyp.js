const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-primitives-temporal';
const code = `${namespace}-code`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

const createRecord = (props = {}) =>
	cy.wrap(
		executeQuery(`CREATE (:PropertiesTest $props)`, {
			props: { code, ...props },
		}),
	);

describe('End-to-end - Temporal primitive', () => {
	describe('time', () => {
		afterEach(() => cy.wrap(dropFixtures(namespace)));

		// this is currently buggy
		it.skip('view empty state', () => {
			createRecord();
			cy.visit(`/PropertiesTest/${code}`);
			cy.get('#timeProperty').should('have.text', '');
		});

		it('edit empty state', () => {
			createRecord();
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=timeProperty]').should('have.value', '');
		});

		it('can set a value', () => {
			createRecord();
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=timeProperty]')
				.click()
				.then(input => {
					input[0].dispatchEvent(
						new Event('input', { bubbles: true }),
					);
					input.val('12:15:30');
				})
				.click();
			cy.get('input[name=timeProperty]').should('have.value', '12:15:30');
			save();
			cy.get('#timeProperty').should('have.text', '12:15:30 PM');
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=timeProperty]').should('have.value', '12:15:30');
		});

		it('can set a different value', () => {
			createRecord({ timeProperty: '10:14:29' });
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=timeProperty]').should('have.value', '10:14:29');
			cy.get('input[name=timeProperty]')
				.click()
				.then(input => {
					input[0].dispatchEvent(
						new Event('input', { bubbles: true }),
					);
					input.val('12:15:30');
				})
				.click();
			cy.get('input[name=timeProperty]').should('have.value', '12:15:30');
			save();
			cy.get('#timeProperty').should('have.text', '12:15:30 PM');
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=timeProperty]').should('have.value', '12:15:30');
		});
	});

	describe('date', () => {
		afterEach(() => cy.wrap(dropFixtures(namespace)));

		// this is currently buggy
		it.skip('view empty state', () => {
			createRecord();
			cy.visit(`/PropertiesTest/${code}`);
			cy.get('#dateProperty').should('have.text', '');
		});

		it('edit empty state', () => {
			createRecord();
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=dateProperty]').should('have.value', '');
		});

		it('can set a value', () => {
			createRecord();
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=dateProperty]')
				.click()
				.then(input => {
					input[0].dispatchEvent(
						new Event('input', { bubbles: true }),
					);
					input.val('2020-01-15');
				})
				.click();
			cy.get('input[name=dateProperty]').should(
				'have.value',
				'2020-01-15',
			);
			save();
			cy.get('#dateProperty').should('have.text', '15 January 2020');
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=dateProperty]').should(
				'have.value',
				'2020-01-15',
			);
		});

		it('can set a different value', () => {
			createRecord({ dateProperty: '2019-10-04' });
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=dateProperty]').should(
				'have.value',
				'2019-10-04',
			);
			cy.get('input[name=dateProperty]')
				.click()
				.then(input => {
					input[0].dispatchEvent(
						new Event('input', { bubbles: true }),
					);
					input.val('2020-01-15');
				})
				.click();
			cy.get('input[name=dateProperty]').should(
				'have.value',
				'2020-01-15',
			);
			save();
			cy.get('#dateProperty').should('have.text', '15 January 2020');
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=dateProperty]').should(
				'have.value',
				'2020-01-15',
			);
		});
	});

	describe('datetime', () => {
		afterEach(() => cy.wrap(dropFixtures(namespace)));

		// this is currently buggy
		it.skip('view empty state', () => {
			createRecord();
			cy.visit(`/PropertiesTest/${code}`);
			cy.get('#datetimeProperty').should('have.text', '');
		});

		it('edit empty state', () => {
			createRecord();
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=datetimeProperty]').should('have.value', '');
		});

		it('can set a value', () => {
			createRecord();
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=datetimeProperty]')
				.click()
				.then(input => {
					input[0].dispatchEvent(
						new Event('input', { bubbles: true }),
					);
					input.val('2020-01-15T13:00:00.000');
				})
				.click();
			cy.get('input[name=datetimeProperty]').should(
				'have.value',
				'2020-01-15T13:00:00.000',
			);
			save();
			cy.get('#datetimeProperty').should(
				'have.text',
				'15 January 2020, 1:00:00 PM',
			);
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=datetimeProperty]').should(
				'have.value',
				'2020-01-15T13:00:00.000',
			);
		});

		it('can set a different value', () => {
			createRecord({ datetimeProperty: '2019-02-04T11:00:00.000' });
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=datetimeProperty]').should(
				'have.value',
				'2019-02-04T11:00:00.000',
			);
			cy.get('input[name=datetimeProperty]')
				.click()
				.then(input => {
					input[0].dispatchEvent(
						new Event('input', { bubbles: true }),
					);
					input.val('2020-01-15T13:00:00.000');
				})
				.click();
			cy.get('input[name=datetimeProperty]').should(
				'have.value',
				'2020-01-15T13:00:00.000',
			);
			save();
			cy.get('#datetimeProperty').should(
				'have.text',
				'15 January 2020, 1:00:00 PM',
			);
			cy.visit(`/PropertiesTest/${code}/edit`);
			cy.get('input[name=datetimeProperty]').should(
				'have.value',
				'2020-01-15T13:00:00.000',
			);
		});
	});
});
