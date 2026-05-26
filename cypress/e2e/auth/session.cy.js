describe('Auth - Register and Session', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('/');
  });

  it('switches between login and register tabs', () => {
    cy.getByTestId('auth-tab-register').click();
    cy.getByTestId('auth-input-email').should('be.visible');
    cy.getByTestId('auth-input-confirm-password').should('be.visible');

    cy.getByTestId('auth-tab-login').click();
    cy.getByTestId('auth-input-email').should('not.exist');
  });

  it('validates mismatch password on register', () => {
    cy.getByTestId('auth-tab-register').click();
    cy.getByTestId('auth-input-username').type(`user_${Date.now()}`);
    cy.getByTestId('auth-input-email').type(`user_${Date.now()}@test.com`);
    cy.getByTestId('auth-input-password').type('Password123!');
    cy.getByTestId('auth-input-confirm-password').type('Different123!');
    cy.getByTestId('auth-submit').click();

    cy.contains(/passwords do not match|not the same/i).should('be.visible');
  });

  it('logs out and clears session', () => {
    cy.loginAsTestUser();

    cy.openUserMenu();
    cy.getByTestId('header-menu-logout').click();

    cy.getByTestId('auth-submit').should('be.visible');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.null;
      expect(win.localStorage.getItem('user')).to.be.null;
    });
  });
});
