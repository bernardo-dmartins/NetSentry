describe('Settings - Profile and Notifications', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
    cy.openSettingsModal();
  });

  it('shows user information and notifications sections', () => {
    cy.contains(/User information/i).should('be.visible');
    cy.contains(/Role:/i).should('be.visible');
    cy.contains(/Member since:/i).should('be.visible');
    cy.contains(/Alerts notifications/i).should('be.visible');
    cy.getByTestId('settings-alert-email-input').should('be.visible');
  });

  it('closes modal by close button', () => {
    cy.getByTestId('settings-close-button').click();
    cy.getByTestId('settings-modal').should('not.exist');
  });
});
