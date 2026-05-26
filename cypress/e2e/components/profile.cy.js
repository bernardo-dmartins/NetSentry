describe('Profile E2E', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
    cy.goToPage('profile');
  });

  it('renders profile information', () => {
    cy.contains('Profile').should('be.visible');
    cy.contains(/Account details/i).should('be.visible');
    cy.contains(Cypress.env('testUser').username).should('be.visible');
  });
});
