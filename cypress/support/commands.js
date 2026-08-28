// Shared Cypress commands focused on deterministic interactions.

const buildRegistrationEmail = (baseInbox) => {
  const inbox = baseInbox || Cypress.env('emailTestInbox') || Cypress.env('testUser')?.email;
  const [localPart, domainPart] = String(inbox).split('@');
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (!localPart || !domainPart) {
    throw new Error('Unable to build a registration email from the configured inbox.');
  }

  return `${localPart}.e2e.${uniqueSuffix}@${domainPart}`;
};

Cypress.Commands.add('generateRegistrationUser', (usernamePrefix = 'e2e_user') => {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    username: `${usernamePrefix}_${uniqueId}`,
    email: buildRegistrationEmail(),
    password: 'Test123!',
  };
});

Cypress.Commands.add('getByTestId', (testId, ...args) => {
  return cy.get(`[data-testid="${testId}"]`, ...args);
});

Cypress.Commands.add('loginViaAPI', (username, password) => {
  const apiUrl = Cypress.env('apiUrl');

  const login = () =>
    cy.request({
      method: 'POST',
      url: `${apiUrl}/auth/login`,
      body: { username, password },
      failOnStatusCode: false,
    });

  const registerTestUser = () => {
    const testUser = Cypress.env('testUser');
    const email = buildRegistrationEmail();

    return cy.request({
      method: 'POST',
      url: `${apiUrl}/auth/register`,
      body: {
        username: testUser.username,
        email,
        password: testUser.password,
      },
      failOnStatusCode: false,
    });
  };

  login().then((response) => {
    if (response.status === 401) {
      return registerTestUser().then((registerResponse) => {
        expect([201, 400]).to.include(registerResponse.status);
        return login();
      });
    }

    return response;
  }).then((response) => {
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
  const apiUrl = Cypress.env('apiUrl');
  const user = {
    username: `session_user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: buildRegistrationEmail(),
    password: 'Test123!',
  };

  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/register`,
    body: user,
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) {
      expect(response.body.success).to.eq(true);
      expect(response.body.data.token).to.be.a('string');

      cy.visit('/login');
      cy.window().then((win) => {
        win.localStorage.setItem('token', response.body.data.token);
        win.localStorage.setItem('user', JSON.stringify(response.body.data.user));
      });
      return;
    }

    if (response.status === 400) {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/auth/login`,
        body: { username: user.username, password: user.password },
      }).then((loginResponse) => {
        expect(loginResponse.status).to.eq(200);
        expect(loginResponse.body.success).to.eq(true);
        expect(loginResponse.body.data.token).to.be.a('string');

        cy.visit('/login');
        cy.window().then((win) => {
          win.localStorage.setItem('token', loginResponse.body.data.token);
          win.localStorage.setItem('user', JSON.stringify(loginResponse.body.data.user));
        });
      });
      return;
    }

    throw new Error(`Unexpected registration response: ${response.status}`);
  });

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
  const apiBaseUrl = String(Cypress.env('apiUrl')).replace(/\/api\/?$/, '');
  const checkUrl = device.checkUrl === undefined
    ? `${apiBaseUrl}/health`
    : device.checkUrl;

  cy.intercept('POST', '**/api/devices').as('createDevice');

  cy.openAddHostModal();

  cy.getByTestId('host-input-name').clear().type(device.name);
  cy.getByTestId('host-input-ip').clear().type(device.ip);

  if (device.type) {
    cy.getByTestId(`host-type-${device.type}`).click();
  }

  if (checkUrl) {
    cy.getByTestId('host-input-check-url').clear().type(checkUrl);
  }

  if (device.port) {
    cy.getByTestId('host-input-port').clear().type(`${device.port}`);
  }

  if (device.description) {
    cy.getByTestId('host-input-description').clear().type(device.description);
  }

  cy.getByTestId('host-modal-save-button').click();
  cy.wait('@createDevice')
    .its('response.statusCode')
    .should('eq', 201);
  cy.getByTestId('host-modal').should('not.exist');
});
