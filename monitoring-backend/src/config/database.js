const { Sequelize } = require("sequelize");
const logger = require("../utils/logger");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: process.env.DB_STORAGE || "./database.sqlite",
  logging: process.env.DB_LOGGING === "true" ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
  },
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info("Database connection established successfully");
    return true;
  } catch (error) {
    logger.error("Failed to connect to the database");
    return false;
  }
};

const syncDatabase = async (force = false) => {
  try {
    const useAlter = process.env.DB_SYNC_ALTER === "true";
    await sequelize.sync({ force, alter: useAlter });
    logger.info(
      `Database synchronized ${force ? "(force)" : ""}${useAlter ? " (alter)" : ""}`
    );
  } catch (error) {
    logger.error("Failed to synchronized to the database:", error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
};
