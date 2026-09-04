describe('Devices - Delete', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
  });

  it('deletes host after confirmation', () => {
    const name = `e2e-delete-${Date.now()}`;
    const ip = `172.19.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;

    cy.createDeviceViaUI({ name, ip, type: 'database' });

    cy.contains('tr', name).within(() => {
      cy.get('[data-testid^="device-delete-"]').click();
    });

    cy.getByTestId('delete-confirm-modal').should('be.visible');
    cy.getByTestId('delete-confirm-button').click();

    cy.contains(name).should('not.exist');
  });

  it('keeps host when cancellation is clicked', () => {
    const name = `e2e-cancel-delete-${Date.now()}`;
    const ip = `172.20.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;

    cy.createDeviceViaUI({ name, ip, type: 'pc' });

    cy.contains('tr', name).within(() => {
      cy.get('[data-testid^="device-delete-"]').click();
    });

    cy.getByTestId('delete-cancel-button').click();
    cy.contains(name).should('be.visible');
  });
});
