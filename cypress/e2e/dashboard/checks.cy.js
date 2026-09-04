describe('Checks E2E', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/devices*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 501,
            name: 'E2E Device',
            ip: '192.168.50.10',
            type: 'server',
            status: 'online',
            responseTime: 22,
            lastCheck: new Date().toISOString(),
            checksSummary: { total: 1, active: 1, online: 1, warning: 0, offline: 0, unknown: 0 }
          }
        ],
        stats: { total: 1, online: 1, offline: 0, warning: 0 }
      }
    }).as('getDevices');

    cy.intercept('GET', '**/api/alerts/recent*', {
      statusCode: 200,
      body: { success: true, data: [] }
    }).as('getRecentAlerts');

    cy.loginAsTestUser();
    cy.wait('@getDevices');
    cy.wait('@getRecentAlerts');
  });

  it('creates a check from checks panel', () => {
    let checks = [];

    cy.intercept('GET', '**/api/devices/501/checks', (req) => {
      req.reply({ statusCode: 200, body: { success: true, data: checks } });
    }).as('getChecks');

    cy.intercept('POST', '**/api/devices/501/checks', (req) => {
      checks = [
        {
          id: 900,
          name: req.body.name,
          type: req.body.type,
          intervalSeconds: req.body.intervalSeconds,
          lastStatus: 'unknown'
        }
      ];
      req.reply({ statusCode: 200, body: { success: true, data: checks[0] } });
    }).as('createCheck');

    cy.getByTestId('checks-panel').should('be.visible');
    cy.wait('@getChecks');
    cy.getByTestId('checks-add-button').click();

    cy.getByTestId('check-form-modal').should('be.visible');
    cy.getByTestId('check-input-name').type('HTTP Home');
    cy.getByTestId('check-input-type').select('http');
    cy.getByTestId('check-modal-save-button').click();

    cy.wait('@createCheck');
    cy.contains(/Check created successfully/i).should('be.visible');
  });

  it('runs and deletes an existing check', () => {
    const checks = [
      { id: 901, name: 'Ping Main', type: 'ping', intervalSeconds: 30, lastStatus: 'online' }
    ];

    cy.intercept('GET', '**/api/devices/501/checks', {
      statusCode: 200,
      body: { success: true, data: checks }
    }).as('getChecksExisting');

    cy.intercept('POST', '**/api/checks/901/run', {
      statusCode: 200,
      body: { success: true }
    }).as('runCheck');

    cy.intercept('DELETE', '**/api/checks/901', {
      statusCode: 200,
      body: { success: true }
    }).as('deleteCheck');

    cy.intercept('GET', '**/api/checks/901/history*', {
      statusCode: 200,
      body: { success: true, data: [] }
    }).as('checkHistory');

    cy.intercept('GET', '**/api/checks/901/stats*', {
      statusCode: 200,
      body: { success: true, data: { uptime: 100, responseTime: { average: 15 } } }
    }).as('checkStats');

    cy.wait('@getChecksExisting');
    cy.getByTestId('check-run-901').click();
    cy.wait('@runCheck');

    cy.on('window:confirm', () => true);
    cy.getByTestId('check-delete-901').click();
    cy.wait('@deleteCheck');
  });
});
