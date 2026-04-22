'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Adding new fields to device_checks table...');

    // Verificar se a tabela existe
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('device_checks')) {
      throw new Error('Table device_checks does not exist. Run base migration first.');
    }

    // Verificar quais colunas já existem
    const tableDescription = await queryInterface.describeTable('device_checks');

    // Adicionar nextRunAt se não existir
    if (!tableDescription.nextRunAt) {
      await queryInterface.addColumn('device_checks', 'nextRunAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Próxima execução agendada'
      });
      console.log('Added column: nextRunAt');
    }

    // Adicionar consecutiveFailures se não existir
    if (!tableDescription.consecutiveFailures) {
      await queryInterface.addColumn('device_checks', 'consecutiveFailures', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Falhas consecutivas'
      });
      console.log('Added column: consecutiveFailures');
    }

    // Adicionar totalRuns se não existir
    if (!tableDescription.totalRuns) {
      await queryInterface.addColumn('device_checks', 'totalRuns', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total de execuções'
      });
      console.log('Added column: totalRuns');
    }

    // Adicionar successfulRuns se não existir
    if (!tableDescription.successfulRuns) {
      await queryInterface.addColumn('device_checks', 'successfulRuns', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Execuções bem-sucedidas'
      });
      console.log('Added column: successfulRuns');
    }

    // Adicionar índice composto para scheduler (se não existir)
    try {
      await queryInterface.addIndex('device_checks', ['isActive', 'nextRunAt'], {
        name: 'device_checks_isActive_nextRunAt_idx'
      });
      console.log('Added index: isActive_nextRunAt');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('Index already exists: isActive_nextRunAt');
    }

    // Inicializar nextRunAt para checks ativos existentes
    await queryInterface.sequelize.query(`
      UPDATE device_checks 
      SET nextRunAt = datetime('now')
      WHERE isActive = 1 AND nextRunAt IS NULL
    `);
    console.log('Initialized nextRunAt for existing active checks');

    console.log('Migration completed successfully');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Removing new fields from device_checks table...');

    // Remover índice
    try {
      await queryInterface.removeIndex('device_checks', 'device_checks_isActive_nextRunAt_idx');
      console.log('Removed index: isActive_nextRunAt');
    } catch (error) {
      console.log('Index might not exist');
    }

    // Remover colunas
    const tableDescription = await queryInterface.describeTable('device_checks');

    if (tableDescription.successfulRuns) {
      await queryInterface.removeColumn('device_checks', 'successfulRuns');
      console.log('Removed column: successfulRuns');
    }

    if (tableDescription.totalRuns) {
      await queryInterface.removeColumn('device_checks', 'totalRuns');
      console.log('Removed column: totalRuns');
    }

    if (tableDescription.consecutiveFailures) {
      await queryInterface.removeColumn('device_checks', 'consecutiveFailures');
      console.log('Removed column: consecutiveFailures');
    }

    if (tableDescription.nextRunAt) {
      await queryInterface.removeColumn('device_checks', 'nextRunAt');
      console.log('Removed column: nextRunAt');
    }

    console.log('Rollback completed successfully');
  }
};