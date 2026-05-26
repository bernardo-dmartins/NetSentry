describe('Dashboard - Auto Refresh', () => {
  it('refreshes devices request automatically', () => {
    cy.clock();
    cy.loginAsTestUser();

    cy.intercept('GET', '**/api/devices*').as('getDevices');

    cy.tick(11000);
    cy.wait('@getDevices');
  });
});
