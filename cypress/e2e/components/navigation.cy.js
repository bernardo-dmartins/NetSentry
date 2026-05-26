describe('App Navigation', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
  });

  it('navigates across main modules', () => {
    cy.goToPage('dashboard');
    cy.contains(/Host Monitoring/i).should('be.visible');

    cy.goToPage('analytics');
    cy.getByTestId('analytics-page').should('be.visible');

    cy.goToPage('alerts');
    cy.getByTestId('alerts-page').should('be.visible');

    cy.goToPage('settings');
    cy.getByTestId('system-settings-page').should('be.visible');

    cy.goToPage('profile');
    cy.contains(/Profile/i).should('be.visible');
  });
});
