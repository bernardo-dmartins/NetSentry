describe('Devices - Update', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
  });

  it('updates host name from edit modal', () => {
    const base = `e2e-update-${Date.now()}`;
    const ip = `172.18.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    const updatedName = `${base}-edited`;

    cy.createDeviceViaUI({ name: base, ip, type: 'switch' });

    cy.contains('tr', base).within(() => {
      cy.get('[data-testid^="device-edit-"]').click();
    });

    cy.getByTestId('host-modal').should('be.visible');
    cy.getByTestId('host-input-name').clear().type(updatedName);
    cy.intercept('PUT', '**/api/devices/*').as('updateDevice');
    cy.getByTestId('host-modal-save-button').click();

    cy.wait('@updateDevice')
      .its('response.statusCode')
      .should('eq', 200);
    cy.getByTestId('host-modal').should('not.exist');
    cy.contains(updatedName).should('be.visible');
  });
});
