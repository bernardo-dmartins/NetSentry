const buildAlertsState = () => [
  {
    id: 101,
    device: 'Core Router',
    message: 'Packet loss detected',
    level: 'warning',
    timestamp: '2026-05-28T12:00:00.000Z',
    acknowledged: false,
    resolved: false,
    deviceInfo: { ip: '10.0.0.1' },
  },
  {
    id: 102,
    device: 'DB Server',
    message: 'Host offline',
    level: 'disaster',
    timestamp: '2026-05-28T12:05:00.000Z',
    acknowledged: true,
    resolved: false,
    acknowledgedAt: '2026-05-28T12:06:00.000Z',
    deviceInfo: { ip: '10.0.0.2' },
  },
  {
    id: 103,
    device: 'Cache Node',
    message: 'Latency above threshold',
    level: 'information',
    timestamp: '2026-05-28T12:10:00.000Z',
    acknowledged: true,
    resolved: true,
    acknowledgedAt: '2026-05-28T12:11:00.000Z',
    resolvedAt: '2026-03-01T12:12:00.000Z',
    deviceInfo: { ip: '10.0.0.3' },
  },
];

describe('Alerts Page', () => {
  beforeEach(() => {
    const state = buildAlertsState();

    cy.intercept('GET', '**/api/alerts*', (req) => {
      const responseAlerts = [...state].sort((a, b) => b.id - a.id);
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: responseAlerts,
          meta: {
            total: responseAlerts.length,
            resolved: responseAlerts.filter((alert) => alert.resolved).length,
            unresolved: responseAlerts.filter((alert) => !alert.resolved).length,
          },
        },
      });
    }).as('getAlerts');

    cy.intercept('PUT', '**/api/alerts/*/acknowledge', (req) => {
      const id = Number(req.url.match(/\/alerts\/(\d+)\/acknowledge/)?.[1]);
      const alert = state.find((item) => item.id === id);
      if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedAt = '2026-05-28T12:20:00.000Z';
      }
      req.reply({ statusCode: 200, body: { success: true } });
    }).as('ackAlert');

    cy.intercept('PUT', '**/api/alerts/*/resolve', (req) => {
      const id = Number(req.url.match(/\/alerts\/(\d+)\/resolve/)?.[1]);
      const alert = state.find((item) => item.id === id);
      if (alert) {
        alert.resolved = true;
        alert.resolvedAt = '2026-05-28T12:25:00.000Z';
      }
      req.reply({ statusCode: 200, body: { success: true } });
    }).as('resolveAlert');

    cy.intercept('DELETE', '**/api/alerts/*', (req) => {
      const id = Number(req.url.match(/\/alerts\/(\d+)$/)?.[1]);
      const index = state.findIndex((item) => item.id === id);
      if (index >= 0) state.splice(index, 1);
      req.reply({ statusCode: 200, body: { success: true } });
    }).as('deleteAlert');

    cy.intercept('DELETE', '**/api/alerts/cleanup*', (req) => {
      const days = Number(req.query.days || 30);
      const cutoff = new Date('2026-05-28T12:30:00.000Z');
      const cutoffTime = cutoff.getTime() - days * 24 * 60 * 60 * 1000;

      for (let i = state.length - 1; i >= 0; i -= 1) {
        const alert = state[i];
        if (alert.resolved && new Date(alert.resolvedAt || alert.timestamp).getTime() < cutoffTime) {
          state.splice(i, 1);
        }
      }

      req.reply({ statusCode: 200, body: { success: true } });
    }).as('cleanupAlerts');

    cy.loginAsTestUser();
    cy.goToPage('alerts');
    cy.wait('@getAlerts');
  });

  it('renders the alerts list and supports filters/search', () => {
    cy.getByTestId('alerts-page').should('be.visible');
    cy.contains('3 items').should('be.visible');
    cy.contains('Core Router').should('be.visible');
    cy.contains('DB Server').should('be.visible');
    cy.contains('Cache Node').should('be.visible');

    cy.getByTestId('alerts-search-input').type('Core');
    cy.contains('Core Router').should('be.visible');
    cy.contains('DB Server').should('not.exist');

    cy.getByTestId('alerts-search-input').clear();
    cy.getByTestId('alerts-level-filter').select('disaster');
    cy.contains('DB Server').should('be.visible');
    cy.contains('Core Router').should('not.exist');

    cy.getByTestId('alerts-level-filter').select('all');
    cy.getByTestId('alerts-status-filter').select('resolved');
    cy.contains('Cache Node').should('be.visible');
    cy.contains('DB Server').should('not.exist');
  });

  it('acknowledges, resolves, refreshes and cleans up alerts', () => {
    cy.getByTestId('alert-item-101').should('contain', 'open');
    cy.getByTestId('alert-ack-101').click();
    cy.wait('@ackAlert');
    cy.getByTestId('alert-item-101').should('contain', 'acknowledged');

    cy.getByTestId('alert-resolve-101').click();
    cy.wait('@resolveAlert');
    cy.getByTestId('alert-item-101').should('contain', 'resolved');

    cy.getByTestId('alerts-refresh-button').click();
    cy.wait('@getAlerts');
    cy.contains('3 items').should('be.visible');

    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('30').as('cleanupPrompt');
    });
    cy.getByTestId('alerts-cleanup-button').click();
    cy.get('@cleanupPrompt').should('have.been.calledOnce');
    cy.wait('@cleanupAlerts');
    cy.getByTestId('alerts-refresh-button').click();
    cy.wait('@getAlerts');
    cy.contains('2 items').should('be.visible');
    cy.contains('Cache Node').should('not.exist');
  });
});
