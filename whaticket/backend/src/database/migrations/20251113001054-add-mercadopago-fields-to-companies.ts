import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Companies", "mpAccessToken", {
        type: DataTypes.TEXT,
        allowNull: true
      }),
      queryInterface.addColumn("Companies", "mpPublicKey", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("Companies", "mpWebhookUrl", {
        type: DataTypes.TEXT,
        allowNull: true
      }),
      queryInterface.addColumn("Companies", "mpWebhookSecret", {
        type: DataTypes.STRING,
        allowNull: true
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Companies", "mpAccessToken"),
      queryInterface.removeColumn("Companies", "mpPublicKey"),
      queryInterface.removeColumn("Companies", "mpWebhookUrl"),
      queryInterface.removeColumn("Companies", "mpWebhookSecret")
    ]);
  }
};