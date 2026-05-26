describe('Alerts E2E', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/alerts*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 101,
            device: 'Core Router',
            message: 'Packet loss detected',
            level: 'warning',
            timestamp: new Date().toISOString(),
            acknowledged: false,
            resolved: false,
            deviceInfo: { ip: '10.0.0.1' }
          },
          {
            id: 102,
            device: 'DB Server',
            message: 'Host offline',
            level: 'disaster',
            timestamp: new Date().toISOString(),
            acknowledged: true,
            resolved: false,
            acknowledgedAt: new Date().toISOString(),
            deviceInfo: { ip: '10.0.0.2' }
          }
        ],
        meta: { total: 2, resolved: 0, unresolved: 2 }
      }
    }).as('getAlerts');

    cy.intercept('PUT', '**/api/alerts/*/acknowledge', { statusCode: 200, body: { success: true } }).as('ackAlert');
    cy.intercept('PUT', '**/api/alerts/*/resolve', { statusCode: 200, body: { success: true } }).as('resolveAlert');
    cy.intercept('DELETE', '**/api/alerts/*', { statusCode: 200, body: { success: true } }).as('deleteAlert');
    cy.intercept('DELETE', '**/api/alerts/cleanup*', { statusCode: 200, body: { success: true } }).as('cleanupAlerts');

    cy.loginAsTestUser();
    cy.goToPage('alerts');
    cy.wait('@getAlerts');
  });

  it('loads alerts page and filters by search and level', () => {
    cy.getByTestId('alerts-page').should('be.visible');
    cy.getByTestId('alerts-search-input').type('Core Router');
    cy.contains('Core Router').should('be.visible');
    cy.contains('DB Server').should('not.exist');

    cy.getByTestId('alerts-search-input').clear();
    cy.getByTestId('alerts-level-filter').select('disaster');
    cy.contains('DB Server').should('be.visible');
  });

  it('acknowledges and resolves an alert', () => {
    cy.getByTestId('alert-ack-101').click();
    cy.wait('@ackAlert');
    cy.contains('acknowledged').should('be.visible');

    cy.getByTestId('alert-resolve-101').click();
    cy.wait('@resolveAlert');
    cy.contains('resolved').should('be.visible');
  });
});
