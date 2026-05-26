describe('Notifications E2E', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/notifications/unread-count', {
      statusCode: 200,
      body: { success: true, count: 2 }
    }).as('unreadCount');

    cy.intercept('GET', '**/api/notifications', {
      statusCode: 200,
      body: {
        success: true,
        unreadCount: 2,
        data: [
          {
            id: 1,
            title: 'Device Offline',
            message: 'Core Router is offline',
            severity: 'critical',
            type: 'alert',
            read: false,
            createdAt: new Date().toISOString()
          },
          {
            id: 2,
            title: 'Recovery',
            message: 'DB Server is back online',
            severity: 'info',
            type: 'recovery',
            read: true,
            createdAt: new Date().toISOString()
          }
        ]
      }
    }).as('getNotifications');

    cy.intercept('POST', '**/api/notifications/mark-all-read', {
      statusCode: 200,
      body: { success: true }
    }).as('markAllRead');

    cy.loginAsTestUser();
    cy.wait('@unreadCount');
  });

  it('opens dropdown and filters notifications', () => {
    cy.getByTestId('notifications-toggle').click();
    cy.getByTestId('notifications-dropdown').should('be.visible');
    cy.wait('@getNotifications');

    cy.contains('Device Offline').should('be.visible');
    cy.getByTestId('notifications-filter-read').click();
    cy.contains('Recovery').should('be.visible');

    cy.getByTestId('notifications-filter-unread').click();
    cy.contains('Device Offline').should('be.visible');
  });

  it('marks all as read', () => {
    cy.getByTestId('notifications-toggle').click();
    cy.wait('@getNotifications');
    cy.getByTestId('notifications-mark-all-read').click();
    cy.wait('@markAllRead');
  });
});
