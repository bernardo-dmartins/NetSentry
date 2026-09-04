require('./commands');

beforeEach(() => {
  cy.viewport(1920, 1080);
});

Cypress.on('uncaught:exception', (err) => {
  // Keep app/runtime errors visible unless explicitly tolerated.
  // Returning nothing preserves default Cypress behavior (fail test).
  cy.task('logError', `Uncaught exception: ${err.message}`);
});
