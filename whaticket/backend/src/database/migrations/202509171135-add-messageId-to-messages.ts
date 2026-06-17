// src/database/migrations/202509171135-add-messageId-to-messages.ts
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (qi: QueryInterface) => {
    const table = "Messages";
    const desc = (await qi.describeTable(table)) as any; // <-- tipado

    if (!desc.messageId) { // ok agora
      await qi.addColumn(table, "messageId", {
        type: DataTypes.STRING,
        allowNull: true
      });
      await qi.addIndex(table, ["companyId", "messageId"], {
        name: "messages_company_messageId_idx"
      });
    }
  },

  down: async (qi: QueryInterface) => {
    const table = "Messages";
    const desc = (await qi.describeTable(table)) as any; // <-- tipado

    if (desc.messageId) {
      await qi.removeIndex(table, "messages_company_messageId_idx").catch(() => {});
      await qi.removeColumn(table, "messageId");
    }
  }
};
