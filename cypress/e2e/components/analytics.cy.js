describe('Analytics E2E', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/analytics/overview*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          stats: {
            averageUptime: 99.1,
            avgResponseTime: 42,
            totalIncidents: 3,
            totalDowntimeMinutes: 12
          },
          uptimeSeries: [
            { time: new Date().toISOString(), uptime: 99.1 }
          ],
          responseTimeSeries: [
            { time: new Date().toISOString(), avg: 42, max: 80, min: 20 }
          ],
          deviceUptime: [
            { name: 'Core Router', uptime: 99.9, downtime: 0.1 },
            { name: 'DB Server', uptime: 97.5, downtime: 2.5 }
          ]
        }
      }
    }).as('getAnalytics');

    cy.loginAsTestUser();
    cy.goToPage('analytics');
    cy.wait('@getAnalytics');
  });

  it('renders analytics dashboard and changes range', () => {
    cy.getByTestId('analytics-page').should('be.visible');
    cy.contains('Analytics Dashboard').should('be.visible');
    cy.contains('99.10%').should('be.visible');

    cy.getByTestId('analytics-range-7d').click();
    cy.wait('@getAnalytics');
    cy.getByTestId('analytics-range-30d').click();
    cy.wait('@getAnalytics');
  });
});
