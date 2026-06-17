import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // ⚠️ Só adiciona se ainda não existir (proteção extra se você rodar 2x)
    const table = "Companies";

    // smtpHost
    await queryInterface.addColumn(table, "smtpHost", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });

    // smtpPort
    await queryInterface.addColumn(table, "smtpPort", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });

    // smtpSecure
    await queryInterface.addColumn(table, "smtpSecure", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });

    // smtpUser
    await queryInterface.addColumn(table, "smtpUser", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });

    // smtpPass
    await queryInterface.addColumn(table, "smtpPass", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });

    // smtpFrom
    await queryInterface.addColumn(table, "smtpFrom", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });
  },

  down: async (queryInterface: QueryInterface) => {
    const table = "Companies";

    await queryInterface.removeColumn(table, "smtpFrom");
    await queryInterface.removeColumn(table, "smtpPass");
    await queryInterface.removeColumn(table, "smtpUser");
    await queryInterface.removeColumn(table, "smtpSecure");
    await queryInterface.removeColumn(table, "smtpPort");
    await queryInterface.removeColumn(table, "smtpHost");
  }
};
