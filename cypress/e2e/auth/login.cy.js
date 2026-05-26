describe('Auth - Login', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('/');
  });

  it('renders login form', () => {
    cy.contains('NetSentry').should('be.visible');
    cy.getByTestId('auth-input-username').should('be.visible');
    cy.getByTestId('auth-input-password').should('be.visible');
    cy.getByTestId('auth-submit').should('be.visible');
  });

  it('logs in with valid credentials', () => {
    const user = Cypress.env('testUser');

    cy.getByTestId('auth-input-username').type(user.username);
    cy.getByTestId('auth-input-password').type(user.password);
    cy.getByTestId('auth-submit').click();

    cy.contains(/Host Monitoring/i).should('be.visible');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.a('string');
      expect(win.localStorage.getItem('user')).to.be.a('string');
    });
  });

  it('shows error for invalid credentials', () => {
    cy.getByTestId('auth-input-username').type('invalid-user');
    cy.getByTestId('auth-input-password').type('invalid-password');
    cy.getByTestId('auth-submit').click();

    cy.contains(/invalid|error/i).should('be.visible');
  });
});
