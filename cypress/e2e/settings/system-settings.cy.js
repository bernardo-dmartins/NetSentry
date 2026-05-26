describe('System Settings E2E', () => {
  const settingsPayload = {
    monitoring: { interval: 30, timeout: 5, retries: 3, autoRestart: true },
    notifications: { emailAlerts: true, criticalOnly: false, pushNotifications: false, alertSound: true, quietHours: false, quietStart: '22:00', quietEnd: '08:00' },
    dashboard: { theme: 'dark', refreshRate: 10, showCharts: true, compactMode: false, animationsEnabled: true },
    security: { sessionTimeout: 60, requireStrongPassword: true, twoFactorAuth: false, loginNotifications: true },
    dataRetention: { keepLogs: 30, keepAlerts: 90, keepMetrics: 365, autoCleanup: true }
  };

  beforeEach(() => {
    cy.intercept('GET', '**/api/settings/system', {
      statusCode: 200,
      body: { success: true, data: settingsPayload }
    }).as('getSystemSettings');

    cy.intercept('POST', '**/api/settings/system', {
      statusCode: 200,
      body: { success: true, data: settingsPayload }
    }).as('saveSystemSettings');

    cy.intercept('POST', '**/api/settings/system/reset', {
      statusCode: 200,
      body: { success: true, data: settingsPayload }
    }).as('resetSystemSettings');

    cy.loginAsTestUser();
    cy.goToPage('settings');
    cy.wait('@getSystemSettings');
  });

  it('updates refresh rate and saves', () => {
    cy.getByTestId('system-settings-page').should('be.visible');
    cy.getByTestId('system-settings-dashboard-refresh-rate').clear().type('15');
    cy.getByTestId('system-settings-save-button').click();
    cy.wait('@saveSystemSettings');
  });

  it('resets settings to default', () => {
    cy.on('window:confirm', () => true);
    cy.getByTestId('system-settings-reset-button').click();
    cy.wait('@resetSystemSettings');
  });
});
