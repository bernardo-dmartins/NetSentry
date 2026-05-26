// Shared Cypress commands focused on deterministic interactions.

Cypress.Commands.add('getByTestId', (testId, ...args) => {
  return cy.get(`[data-testid="${testId}"]`, ...args);
});

Cypress.Commands.add('loginViaAPI', (username, password) => {
  const apiUrl = Cypress.env('apiUrl');

  cy.request('POST', `${apiUrl}/auth/login`, { username, password }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.success).to.eq(true);
    expect(response.body.data.token).to.be.a('string');

    cy.visit('/login');
    cy.window().then((win) => {
      win.localStorage.setItem('token', response.body.data.token);
      win.localStorage.setItem('user', JSON.stringify(response.body.data.user));
    });
  });
});

Cypress.Commands.add('loginAsTestUser', () => {
  const testUser = Cypress.env('testUser');
  cy.loginViaAPI(testUser.username, testUser.password);
  cy.visit('/');
  cy.contains(/Host Monitoring/i).should('be.visible');
});

Cypress.Commands.add('openUserMenu', () => {
  cy.getByTestId('header-user-menu-button').click();
  cy.getByTestId('header-menu-settings').should('be.visible');
  cy.getByTestId('header-menu-logout').should('be.visible');
});

Cypress.Commands.add('goToPage', (pageId) => {
  cy.getByTestId(`sidebar-nav-${pageId}`).click();
});

Cypress.Commands.add('openSettingsModal', () => {
  cy.openUserMenu();
  cy.getByTestId('header-menu-settings').click();
  cy.getByTestId('settings-modal').should('be.visible');
});

Cypress.Commands.add('openAddHostModal', () => {
  cy.getByTestId('dashboard-add-host-button').click();
  cy.getByTestId('host-modal').should('be.visible');
});

Cypress.Commands.add('createDeviceViaUI', (device) => {
  cy.openAddHostModal();

  cy.getByTestId('host-input-name').clear().type(device.name);
  cy.getByTestId('host-input-ip').clear().type(device.ip);

  if (device.type) {
    cy.getByTestId(`host-type-${device.type}`).click();
  }

  if (device.checkUrl) {
    cy.getByTestId('host-input-check-url').clear().type(device.checkUrl);
  }

  if (device.port) {
    cy.getByTestId('host-input-port').clear().type(`${device.port}`);
  }

  if (device.description) {
    cy.getByTestId('host-input-description').clear().type(device.description);
  }

  cy.getByTestId('host-modal-save-button').click();
  cy.contains(/Host added successfully|Host updated successfully/i).should('be.visible');
});
