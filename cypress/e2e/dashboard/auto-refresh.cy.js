describe('Dashboard - Auto Refresh', () => {
  it('refreshes devices request automatically', () => {
    cy.intercept('GET', '**/api/settings/system', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          dashboard: { refreshRate: 5 },
          notifications: {}
        }
      }
    }).as('getSystemSettings');

    cy.intercept('GET', '**/api/devices*', {
      statusCode: 200,
      body: {
        success: true,
        data: [],
        stats: { total: 0, online: 0, offline: 0, warning: 0 }
      }
    }).as('getDevices');

    cy.intercept('GET', '**/api/alerts/recent', {
      statusCode: 200,
      body: { success: true, data: [] }
    }).as('getRecentAlerts');

    cy.loginAsTestUser();
    cy.wait('@getSystemSettings');
    cy.wait('@getDevices');
    cy.wait('@getRecentAlerts');

    cy.wait('@getDevices', { timeout: 10000 });
  });
});
