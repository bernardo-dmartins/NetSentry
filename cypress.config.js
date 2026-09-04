const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.js",
    specPattern: "cypress/**/*.cy.{js,jsx,ts,tsx}",
    viewportWidth: 1920,
    viewportHeight: 1080,
    video: true,
    screenshotOnRunFailure: true,

    env: {
      apiUrl: "http://localhost:5000/api",
      emailTestInbox: "netsentry.app@gmail.com",

      testUser: {
        username: "testuser",
        password: "Test123!",
        email: "test@netsentry.com",
      },
    },

    setupNodeEvents(on, config) {
      // Custom tasks
      on("task", {
        log(message) {
          console.log(message);
          return null;
        },

        logError(message) {
          console.error(message);
          return null;
        },

        async cleanupTestData() {
          console.log("Cleaning up test data...");
          return null;
        },

        async queryDatabase(query) {
          console.log("Query:", query);
          return null;
        },
      });

      on("before:run", async (details) => {
        console.log("Validating test environment...");

        try {
          const backendHealth = await fetch("http://localhost:5000/health");
          if (!backendHealth.ok) {
            throw new Error(
              `Backend health check failed: ${backendHealth.status}`,
            );
          }
          console.log("Backend is running");
        } catch (error) {
          console.error("Backend is not running on port 5000");
          console.error(
            "   Please start the backend with: cd monitoring-backend && npm run dev",
          );
          throw error;
        }
      });

      return config;
    },

    retries: {
      runMode: 2,
      openMode: 0,
    },

    defaultCommandTimeout: 15000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    pageLoadTimeout: 60000,

    // Viewport presets for responsive testing
    viewportPresets: {
      "macbook-15": { width: 1440, height: 900 },
      "ipad-2": { width: 768, height: 1024 },
      "iphone-x": { width: 375, height: 812 },
    },
  },
});
