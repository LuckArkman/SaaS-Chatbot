import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 🔹 Adiciona a coluna "state" na tabela "Contacts"
    await queryInterface.addColumn("Contacts", "state", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // 🔹 Remove a coluna caso precise dar rollback
    await queryInterface.removeColumn("Contacts", "state");
  }
};
