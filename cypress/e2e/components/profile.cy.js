describe('Profile Page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          username: 'profile_user',
          email: 'profile_user@test.com',
          role: 'user',
          createdAt: '2026-01-10T10:00:00.000Z',
        },
      },
    }).as('getProfile');

    cy.loginAsTestUser();
    cy.goToPage('profile');
    cy.wait('@getProfile');
  });

  it('renders profile data and refreshes it', () => {
    cy.contains('Profile').should('be.visible');
    cy.contains('Account details and basic information').should('be.visible');
    cy.contains('profile_user').should('be.visible');
    cy.contains('profile_user@test.com').should('be.visible');
    cy.contains('User').should('be.visible');

    cy.get('button').contains('Refresh').click();
    cy.wait('@getProfile');
  });
});
