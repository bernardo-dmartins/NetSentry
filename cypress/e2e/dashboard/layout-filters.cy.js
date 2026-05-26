describe('Dashboard - Layout and Filters', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
  });

  it('shows core layout elements', () => {
    cy.contains(/Host Monitoring/i).should('be.visible');
    cy.getByTestId('dashboard-search-input').should('be.visible');
    cy.getByTestId('dashboard-status-filter').should('be.visible');
    cy.getByTestId('dashboard-add-host-button').should('be.visible');
    cy.getByTestId('devices-table').should('be.visible');
  });

  it('filters list using search input', () => {
    const deviceName = `e2e-search-${Date.now()}`;

    cy.createDeviceViaUI({
      name: deviceName,
      ip: `10.10.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      type: 'server'
    });

    cy.getByTestId('dashboard-search-input').clear().type(deviceName);
    cy.contains(deviceName).should('be.visible');

    cy.getByTestId('dashboard-search-input').clear().type('name-that-does-not-exist');
    cy.contains(deviceName).should('not.exist');
  });

  it('applies status filter', () => {
    cy.getByTestId('dashboard-status-filter').select('online');
    cy.getByTestId('dashboard-status-filter').should('have.value', 'online');

    cy.getByTestId('dashboard-status-filter').select('all');
    cy.getByTestId('dashboard-status-filter').should('have.value', 'all');
  });
});
