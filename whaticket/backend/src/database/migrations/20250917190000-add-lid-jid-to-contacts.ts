import { QueryInterface, DataTypes } from "sequelize";

/**
 * Migration: add optional lid and jid columns to Contacts.
 * lid: armazenará IDs alternativos (@lid) recebidos de provedores; jid: armazenará JIDs canônicos.
 * Ambos são opcionais e não exclusivos inicialmente para evitar colisões.
 * Índices ajudam buscas. Ajuste se precisar de UNIQUE em algum caso específico.
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Evitar erro se rodar mais de uma vez (checar se coluna já existe).
    const tableDesc: any = await queryInterface.describeTable("Contacts");

    if (!tableDesc.lid) {
      await queryInterface.addColumn("Contacts", "lid", {
        type: DataTypes.STRING,
        allowNull: true
      });
      await queryInterface.addIndex("Contacts", ["lid"], {
        name: "contacts_lid_idx"
      });
    }

    if (!tableDesc.jid) {
      await queryInterface.addColumn("Contacts", "jid", {
        type: DataTypes.STRING,
        allowNull: true
      });
      await queryInterface.addIndex("Contacts", ["jid"], {
        name: "contacts_jid_idx"
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDesc: any = await queryInterface.describeTable("Contacts");
    if (tableDesc.lid) {
      try { await queryInterface.removeIndex("Contacts", "contacts_lid_idx"); } catch {}
      await queryInterface.removeColumn("Contacts", "lid");
    }
    if (tableDesc.jid) {
      try { await queryInterface.removeIndex("Contacts", "contacts_jid_idx"); } catch {}
      await queryInterface.removeColumn("Contacts", "jid");
    }
  }
};
