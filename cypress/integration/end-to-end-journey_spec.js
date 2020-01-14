const loadFixtures = () => {
	cy.route('POST', '**/api/graphql', 'fixture:generated/biz-ops').as(
		'getBizOpsData',
	);
};

const waitForBizOps = () => {
	cy.wait('@getBizOpsData');
};

describe('End-to-end Journey', () => {
	beforeEach(() => {
		loadFixtures();
		cy.fixture('generated/biz-ops').as('bizOpsState');
	});

	it('Navigates through an end-to-end journey for demo app', function t() {
		waitForBizOps();
		cy.visit(`/System/biz-ops-admin`);
	});
});
