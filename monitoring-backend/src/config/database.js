 const { Sequelize } = require('sequelize');
 const logger = require('../utils/logger');

 // config do Sequelize
 const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './datavase.sqlite',
    logging: process.env.DB_LOGGING === 'true' ? (msg) => logger.debug(msg) : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        underscored: false,
        freezeTableName: true
    }
 });

 // testando a conexão
 const testConnection = async () =>  {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully');
        return true;
     }  catch (error) {
        logger.error('Failed to connect to the database');
        return false; 
    }
 };

 // Sincronizando os modelos com o banco
 const syncDatabase = async (force = false) => {
    try {
        await sequelize.sync({ force });
        logger.info(`Database synchronized ${force ? '(força)' : ''}`);
    } catch (error) {
        logger.error('Failed to synchronized to the database:', error);
        throw error;
    }
 };

 module.exports = {
    sequelize,
    testConnection,
    syncDatabase
 };