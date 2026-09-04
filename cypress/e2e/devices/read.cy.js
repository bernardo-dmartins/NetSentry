describe('Devices - Read', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
  });

  it('shows device details when selecting a row', () => {
    const name = `e2e-read-${Date.now()}`;
    const ip = `172.17.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;

    cy.createDeviceViaUI({ name, ip, type: 'router' });
    cy.contains('tr', name).click();

    cy.contains(/Host Details/i).should('be.visible');
    cy.contains(name).should('be.visible');
    cy.contains(ip).should('be.visible');
  });
});
