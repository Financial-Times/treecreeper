const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-page-delete';
const code = `${namespace}-code`;
const deleteConfirmText =
	'Are you sure you wish to delete?\n\nUnless you created something by accident, a more appropriate action is usually to mark the record as inactive, either in the Is Active or Lifecycle Stage fields,';
describe('End-to-end - delete record', () => {
	before(() => cy.wrap(dropFixtures(namespace)));
	afterEach(() => cy.wrap(dropFixtures(namespace)));
	it('shows a prompt message', () => {
		cy.wrap(
			executeQuery(`CREATE (:RelationshipTestsMany {code: "${code}"})`),
		);
		cy.visit(`/RelationshipTestsMany/${code}`, {
			onBeforeLoad(win) {
				cy.stub(win, 'confirm').returns(false);
			},
		});

		cy.get('[data-button-type="delete"]').click();

		cy.window().then(win => {
			cy.wrap(win).its('confirm').should('called', 1);
			cy.wrap(win)
				.its('confirm.args.0')
				.should('deep.eq', [deleteConfirmText]);
		});
		cy.url().should('contain', `/RelationshipTestsMany/${code}`);
	});

	it('can not delete a record with relationship', () => {
		cy.wrap(
			executeQuery(`
				CREATE (m:RelationshipTestsMany {code: "${code}"}), (o:RelationshipTestsOne {code: "${code}-1"})
				MERGE (m)-[:MANY_TO_ONE]->(o)
				RETURN m, o

`),
		);
		cy.visit(`/RelationshipTestsMany/${code}`, {
			onBeforeLoad(win) {
				cy.stub(win, 'confirm').returns(true);
			},
		});

		cy.get('[data-button-type="delete"]').click();

		cy.url().should('contain', `/RelationshipTestsMany/${code}`);

		cy.get('.o-message__content-main').should(
			'contain',
			`Oops. Could not delete RelationshipTestsMany record for ${code}`,
		);
		cy.get('.o-message__content-additional').should(
			'contain',
			`Cannot delete - RelationshipTestsMany ${code} has relationships.`,
		);
	});

	it('can delete a record', () => {
		cy.wrap(
			executeQuery(`CREATE (:RelationshipTestsMany {code: "${code}"})`),
		);
		cy.visit(`/RelationshipTestsMany/${code}`, {
			onBeforeLoad(win) {
				cy.stub(win, 'confirm').returns(true);
			},
		});

		cy.url().should('contain', `/RelationshipTestsMany/${code}`);

		cy.get('[data-button-type="delete"]').click();

		cy.url().should(
			'contain',
			`/?message=RelationshipTestsMany%20${code}%20was%20successfully%20deleted&messageType=success`,
		);
	});
});
