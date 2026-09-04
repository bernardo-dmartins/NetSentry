describe('Devices - Create', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
  });

  it('opens add host modal and validates required fields', () => {
    cy.openAddHostModal();
    cy.getByTestId('host-modal-save-button').click();
    cy.contains(/Please fill all required fields/i).should('be.visible');
  });

  it('creates host with minimum data', () => {
    const name = `e2e-create-${Date.now()}`;
    const ip = `172.16.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;

    cy.createDeviceViaUI({ name, ip, type: 'server' });
    cy.contains(name).should('be.visible');
  });
});
