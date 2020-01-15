const { setupMocks } = require('../../test-helpers');

// const loadFixtures = () => {
// 	cy.route('POST', '**/api/graphql', 'fixture:generated/biz-ops').as(
// 		'getBizOpsData',
// 	);
// };

// const waitForBizOps = () => {
// 	cy.wait('@getBizOpsData');
// };



describe('End-to-end Journey', () => {
	const namespace = `e2e-demo`;
	const mainCode = `${namespace}-main`;
	const { createNode } = setupMocks(namespace);
	
	beforeEach(() => {

		//loadFixtures();
	});

	it('Navigates through an end-to-end journey for demo app', async () => {
		await createNode('MainType', mainCode);
		cy.visit(`/MainType/${mainCode}`, { headers: { 'client-id': 'test' } });

	});
});
