"use strict";

const TABLE = "CompaniesSettings";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable(TABLE);

    if (!table.closeTicketOnTransfer) {
      await queryInterface.addColumn(TABLE, "closeTicketOnTransfer", {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!table.sendMsgTransfTicket) {
      await queryInterface.addColumn(TABLE, "sendMsgTransfTicket", {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: "disabled"
      });
    }

    if (!table.transferMessage) {
      await queryInterface.addColumn(TABLE, "transferMessage", {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
        defaultValue: ""
      });
    }
  },

  async down(queryInterface) {
    const drop = async (col) => {
      try { await queryInterface.removeColumn(TABLE, col); } catch {}
    };
    await drop("transferMessage");
    await drop("sendMsgTransfTicket");
    await drop("closeTicketOnTransfer");
  }
};
