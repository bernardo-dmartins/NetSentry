describe('Auth - Register to Login Flow', () => {
  it('registers a new user, logs out, and logs in again with the same credentials', () => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('/');

    cy.generateRegistrationUser('welcome_email_user').then((user) => {
      cy.getByTestId('auth-tab-register').click();
      cy.getByTestId('auth-input-username').type(user.username);
      cy.getByTestId('auth-input-email').type(user.email);
      cy.getByTestId('auth-input-password').type(user.password);
      cy.getByTestId('auth-input-confirm-password').type(user.password);
      cy.getByTestId('auth-submit').click();

      cy.contains(/Host Monitoring/i).should('be.visible');

      cy.openUserMenu();
      cy.getByTestId('header-menu-logout').click();
      cy.getByTestId('auth-submit').should('be.visible');

      cy.getByTestId('auth-input-username').type(user.username);
      cy.getByTestId('auth-input-password').type(user.password);
      cy.getByTestId('auth-submit').click();

      cy.contains(/Host Monitoring/i).should('be.visible');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.a('string');
        expect(win.localStorage.getItem('user')).to.be.a('string');
      });
    });
  });
});
