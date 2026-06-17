'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('Campaigns', 'fileListId', {
        type: Sequelize.INTEGER,
        references: { model: 'Files', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true
      }),
      queryInterface.addColumn('Files', 'mediaPath', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      queryInterface.addColumn('Files', 'mediaName', {
        type: Sequelize.STRING,
        allowNull: true
      })
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('Campaigns', 'fileListId'),
      queryInterface.removeColumn('Files', 'mediaPath'),
      queryInterface.removeColumn('Files', 'mediaName')
    ]);
  }
};