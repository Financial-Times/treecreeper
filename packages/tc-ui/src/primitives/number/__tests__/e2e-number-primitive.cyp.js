const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-demo-primitives-number';
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

describe('End-to-end - Number primitive', () => {
	before(() => cy.wrap(dropFixtures(namespace)));
	afterEach(() => cy.wrap(dropFixtures(namespace)));

	describe('integers', () => {
		it('view empty state', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}`);
			cy.get('#integerProperty').should('have.text', '');
		});

		it('edit empty state', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=integerProperty]').should('have.value', '');
		});

		it('can set an integer', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=integerProperty]').type(13);
			save();
			cy.get('#integerProperty').should('have.text', String(13));
		});

		it('can edit an integer', () => {
			createRecord({ integerProperty: 7 });
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=integerProperty]').clear().type(13);
			save();
			cy.get('#integerProperty').should('have.text', String(13));
		});

		it('rejects floats', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=integerProperty]').type(0.7);
			save();
			cy.url().should('contain', `/KitchenSink/${code}/edit`);
			cy.get('.o-message__content-main').should(
				'contain',
				'Oops. Could not update KitchenSink record for e2e-demo',
			);
			cy.get('.o-message__content-additional').should(
				'contain',
				`Invalid value \`0.7\` for property \`integerProperty\` on type \`KitchenSink\`: Must be a finite integer`,
			);
		});

		it('rejects text', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=integerProperty]').type('haha');
			save();
			cy.url().should('contain', `/KitchenSink/${code}/edit`);
			cy.get('.o-message__content-main').should(
				'contain',
				'Oops. Could not update KitchenSink record for e2e-demo',
			);
			cy.get('.o-message__content-additional').should(
				'contain',
				`Invalid value \`haha\` for property \`integerProperty\` on type \`KitchenSink\`: Must be a finite integer`,
			);
		});

		it('saves and redisplays zero', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=integerProperty]').type(0);
			save();
			cy.get('#integerProperty').should('have.text', '0');
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=integerProperty]').should('have.value', '0');
		});

		it('does not parse empty input to zero', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			save();
			cy.get('#integerProperty').should('have.text', '');
		});
	});

	describe('floats', () => {
		it('view empty state', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}`);
			cy.get('#floatProperty').should('have.text', '');
		});

		it('edit empty state', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=floatProperty]').should('have.value', '');
		});

		it('can set an integer', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=floatProperty]').type(13);
			save();
			cy.get('#floatProperty').should('have.text', String(13));
		});

		it('can edit an integer', () => {
			createRecord({ floatProperty: 7 });
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=floatProperty]').clear().type(13);
			save();
			cy.get('#floatProperty').should('have.text', String(13));
		});

		it('accepts floats', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=floatProperty]').type(0.7);
			save();
			cy.get('#floatProperty').should('have.text', String('0.7'));
		});

		it('rejects text', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=floatProperty]').type('haha');
			save();
			cy.url().should('contain', `/KitchenSink/${code}/edit`);
			cy.get('.o-message__content-main').should(
				'contain',
				'Oops. Could not update KitchenSink record for e2e-demo',
			);
			cy.get('.o-message__content-additional').should(
				'contain',
				`Invalid value \`haha\` for property \`floatProperty\` on type \`KitchenSink\`: Must be a finite floating point number`,
			);
		});

		it('saves and redisplays zero', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=floatProperty]').type(0);
			save();
			cy.get('#floatProperty').should('have.text', '0');
			cy.visit(`/KitchenSink/${code}/edit`);
			cy.get('input[name=floatProperty]').should('have.value', '0');
		});

		it('does not parse empty input to zero', () => {
			createRecord();
			cy.visit(`/KitchenSink/${code}/edit`);
			save();
			cy.get('#floatProperty').should('have.text', '');
		});
	});
});
