describe('Settings - Security', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
    cy.openSettingsModal();
  });

  it('validates mismatched new password', () => {
    const user = Cypress.env('testUser');

    cy.getByTestId('settings-current-password-input').type(user.password);
    cy.getByTestId('settings-new-password-input').type('NewPassword123!');
    cy.getByTestId('settings-confirm-password-input').type('DifferentPassword123!');
    cy.getByTestId('settings-save-password-button').click();

    cy.contains(/passwords are not the same/i).should('be.visible');
  });

  it('validates minimum password length', () => {
    const user = Cypress.env('testUser');

    cy.getByTestId('settings-current-password-input').type(user.password);
    cy.getByTestId('settings-new-password-input').type('123');
    cy.getByTestId('settings-confirm-password-input').type('123');
    cy.getByTestId('settings-save-password-button').click();

    cy.contains(/at least 6 characters/i).should('be.visible');
  });
});
