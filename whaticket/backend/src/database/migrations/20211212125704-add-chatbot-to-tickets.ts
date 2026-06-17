import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "chatbot", {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    });

    await queryInterface.addColumn("Tickets", "queueOptionId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "QueueOptions", key: "id" },
      onUpdate: "SET NULL",
      onDelete: "SET NULL"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "queueOptionId");
    await queryInterface.removeColumn("Tickets", "chatbot");
  }
};
