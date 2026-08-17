const buildNotificationsState = () => [
  {
    id: 1,
    title: 'Device Offline',
    message: 'Core Router is offline',
    severity: 'critical',
    type: 'alert',
    read: false,
    createdAt: '2026-05-28T12:00:00.000Z',
  },
  {
    id: 2,
    title: 'Recovery',
    message: 'DB Server is back online',
    severity: 'info',
    type: 'recovery',
    read: true,
    createdAt: '2026-05-28T11:45:00.000Z',
  },
  {
    id: 3,
    title: 'High Response Time',
    message: 'API-Gateway response time is high',
    severity: 'warning',
    type: 'warning',
    read: false,
    createdAt: '2026-05-28T11:30:00.000Z',
  },
];

describe('Notifications Dropdown', () => {
  beforeEach(() => {
    const state = buildNotificationsState();

    cy.intercept('GET', '**/api/notifications/unread-count', {
      statusCode: 200,
      body: { success: true, count: state.filter((n) => !n.read).length },
    }).as('unreadCount');

    cy.intercept('GET', '**/api/notifications', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          unreadCount: state.filter((n) => !n.read).length,
          data: [...state],
        },
      });
    }).as('getNotifications');

    cy.intercept('POST', '**/api/notifications/mark-all-read', (req) => {
      state.forEach((n) => {
        n.read = true;
      });
      req.reply({ statusCode: 200, body: { success: true } });
    }).as('markAllRead');

    cy.intercept('PATCH', '**/api/notifications/*/read', (req) => {
      const id = Number(req.url.match(/\/notifications\/(\d+)\/read/)?.[1]);
      const notification = state.find((n) => n.id === id);
      if (notification) notification.read = true;
      req.reply({ statusCode: 200, body: { success: true } });
    }).as('markRead');

    cy.intercept('DELETE', '**/api/notifications/*', (req) => {
      const id = Number(req.url.match(/\/notifications\/(\d+)$/)?.[1]);
      const index = state.findIndex((n) => n.id === id);
      if (index >= 0) state.splice(index, 1);
      req.reply({ statusCode: 200, body: { success: true } });
    }).as('deleteNotification');

    cy.intercept('DELETE', '**/api/notifications/clear-all', (req) => {
      state.splice(0, state.length);
      req.reply({ statusCode: 200, body: { success: true } });
    }).as('clearAll');

    cy.loginAsTestUser();
    cy.wait('@unreadCount');
  });

  it('opens the dropdown, filters notifications, and marks them as read', () => {
    cy.getByTestId('notifications-toggle').click();
    cy.getByTestId('notifications-dropdown').should('be.visible');
    cy.wait('@getNotifications');

    cy.contains('Device Offline').should('be.visible');
    cy.contains('High Response Time').should('be.visible');

    cy.getByTestId('notifications-filter-read').click();
    cy.contains('Recovery').should('be.visible');
    cy.contains('Device Offline').should('not.exist');

    cy.getByTestId('notifications-filter-unread').click();
    cy.contains('Device Offline').should('be.visible');
    cy.contains('Recovery').should('not.exist');

    cy.contains('Device Offline').click();
    cy.wait('@markRead');
    cy.contains('Mark all read').should('be.visible');
  });

  it('marks all notifications as read, deletes one, and clears everything', () => {
    cy.on('window:confirm', () => true);
    cy.getByTestId('notifications-toggle').click();
    cy.wait('@getNotifications');

    cy.getByTestId('notifications-mark-all-read').click();
    cy.wait('@markAllRead');
    cy.getByTestId('notifications-filter-unread').click();
    cy.contains('No notifications').should('be.visible');

    cy.getByTestId('notifications-filter-all').click();
    cy.getByTestId('notifications-clear-all').click();
    cy.wait('@clearAll');
    cy.contains('No notifications').should('be.visible');
  });
});
