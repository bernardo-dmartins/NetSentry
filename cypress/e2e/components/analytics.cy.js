const analyticsPayloads = {
  '24h': {
    stats: {
      averageUptime: 99.1,
      avgResponseTime: 42,
      totalIncidents: 3,
      totalDowntimeMinutes: 12,
    },
    uptimeSeries: [
      { time: '2026-05-28T08:00:00.000Z', uptime: 99.1 },
      { time: '2026-05-28T12:00:00.000Z', uptime: 99.4 },
    ],
    responseTimeSeries: [
      { time: '2026-05-28T08:00:00.000Z', avg: 42, max: 80, min: 20 },
      { time: '2026-05-28T12:00:00.000Z', avg: 39, max: 75, min: 18 },
    ],
    deviceUptime: [
      { name: 'Core Router', uptime: 99.9, downtime: 0.1 },
      { name: 'DB Server', uptime: 97.5, downtime: 2.5 },
    ],
  },
  '7d': {
    stats: {
      averageUptime: 98.4,
      avgResponseTime: 55,
      totalIncidents: 6,
      totalDowntimeMinutes: 41,
    },
    uptimeSeries: [
      { time: '2026-05-21T08:00:00.000Z', uptime: 98.0 },
      { time: '2026-05-28T08:00:00.000Z', uptime: 98.4 },
    ],
    responseTimeSeries: [
      { time: '2026-05-21T08:00:00.000Z', avg: 55, max: 92, min: 28 },
      { time: '2026-05-28T08:00:00.000Z', avg: 49, max: 88, min: 24 },
    ],
    deviceUptime: [
      { name: 'Core Router', uptime: 99.6, downtime: 0.4 },
      { name: 'DB Server', uptime: 94.1, downtime: 5.9 },
    ],
  },
  '30d': {
    stats: {
      averageUptime: 97.8,
      avgResponseTime: 61,
      totalIncidents: 12,
      totalDowntimeMinutes: 117,
    },
    uptimeSeries: [
      { time: '2026-05-01T08:00:00.000Z', uptime: 97.1 },
      { time: '2026-05-28T08:00:00.000Z', uptime: 97.8 },
    ],
    responseTimeSeries: [
      { time: '2026-05-01T08:00:00.000Z', avg: 61, max: 104, min: 31 },
      { time: '2026-05-28T08:00:00.000Z', avg: 58, max: 96, min: 29 },
    ],
    deviceUptime: [
      { name: 'Core Router', uptime: 98.7, downtime: 1.3 },
      { name: 'DB Server', uptime: 92.9, downtime: 7.1 },
    ],
  },
};

describe('Analytics Page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/analytics/overview*', (req) => {
      const range = req.query.range || '24h';
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: analyticsPayloads[range] || analyticsPayloads['24h'],
        },
      });
    }).as('getAnalytics');

    cy.loginAsTestUser();
    cy.goToPage('analytics');
    cy.wait('@getAnalytics');
  });

  it('renders overview metrics and switches time ranges', () => {
    cy.getByTestId('analytics-page').should('be.visible');
    cy.contains('Analytics Dashboard').should('be.visible');
    cy.contains('99.10%').should('be.visible');
    cy.contains('42ms').should('be.visible');
    cy.contains('3').should('be.visible');
    cy.contains('12m').should('be.visible');

    cy.getByTestId('analytics-range-7d').click();
    cy.wait('@getAnalytics');
    cy.contains('98.40%').should('be.visible');
    cy.contains('55ms').should('be.visible');

    cy.getByTestId('analytics-range-30d').click();
    cy.wait('@getAnalytics');
    cy.contains('97.80%').should('be.visible');
    cy.contains('61ms').should('be.visible');
  });
});
