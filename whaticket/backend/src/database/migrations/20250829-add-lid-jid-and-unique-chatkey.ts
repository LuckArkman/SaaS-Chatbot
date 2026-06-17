import { QueryInterface, DataTypes, Sequelize } from "sequelize";

const CONTACTS = `"Contacts"`;
const TICKETS = `"Tickets"`;

const IDX_CONTACTS = `"contacts_company_whats_chatkey_uq"`;
const IDX_TICKETS  = `"tickets_company_whats_chatkey_uq"`;

module.exports = {
  up: async (queryInterface: QueryInterface, SequelizeLib: typeof Sequelize) => {
    const qi = queryInterface as any;
    const seq = qi.sequelize as Sequelize;

    const hasColumn = async (table: string, column: string) => {
      const [rows] = await (seq as any).query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_name = ${(seq as any).escape(table.replace(/"/g,''))}
           AND column_name = ${(seq as any).escape(column)}`
      );
      return rows.length > 0;
    };

    const hasIndex = async (indexName: string) => {
      const [rows] = await (seq as any).query(
        `SELECT 1 FROM pg_indexes
         WHERE schemaname = current_schema()
           AND indexname = ${(seq as any).escape(indexName.replace(/"/g,''))}`
      );
      return rows.length > 0;
    };

    // Contacts
    if (!(await hasColumn("Contacts","lid"))) {
      await qi.addColumn("Contacts", "lid", { type: DataTypes.TEXT, allowNull: true });
    }
    if (!(await hasColumn("Contacts","jid"))) {
      await qi.addColumn("Contacts", "jid", { type: DataTypes.TEXT, allowNull: true });
    }

    // Tickets
    if (!(await hasColumn("Tickets","lid"))) {
      await qi.addColumn("Tickets", "lid", { type: DataTypes.TEXT, allowNull: true });
    }
    if (!(await hasColumn("Tickets","jid"))) {
      await qi.addColumn("Tickets", "jid", { type: DataTypes.TEXT, allowNull: true });
    }

    // Índices
    if (!(await hasIndex(IDX_CONTACTS))) {
      await (seq as any).query(
        `CREATE UNIQUE INDEX ${IDX_CONTACTS}
           ON ${CONTACTS} ("companyId","whatsappId", COALESCE("lid","jid"))
           WHERE ("lid" IS NOT NULL OR "jid" IS NOT NULL);`
      );
    }
    if (!(await hasIndex(IDX_TICKETS))) {
      await (seq as any).query(
        `CREATE UNIQUE INDEX ${IDX_TICKETS}
           ON ${TICKETS} ("companyId","whatsappId", COALESCE("lid","jid"))
           WHERE ("lid" IS NOT NULL OR "jid" IS NOT NULL);`
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const qi = queryInterface as any;
    const seq = qi.sequelize as Sequelize;

    const hasColumn = async (table: string, column: string) => {
      const [rows] = await (seq as any).query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_name = ${(seq as any).escape(table.replace(/"/g,''))}
           AND column_name = ${(seq as any).escape(column)}`
      );
      return rows.length > 0;
    };

    const hasIndex = async (indexName: string) => {
      const [rows] = await (seq as any).query(
        `SELECT 1 FROM pg_indexes
         WHERE schemaname = current_schema()
           AND indexname = ${(seq as any).escape(indexName.replace(/"/g,''))}`
      );
      return rows.length > 0;
    };

    if (await hasIndex("tickets_company_whats_chatkey_uq")) {
      await (seq as any).query(`DROP INDEX ${IDX_TICKETS};`);
    }
    if (await hasIndex("contacts_company_whats_chatkey_uq")) {
      await (seq as any).query(`DROP INDEX ${IDX_CONTACTS};`);
    }

    if (await hasColumn("Tickets","jid")) await qi.removeColumn("Tickets","jid");
    if (await hasColumn("Tickets","lid")) await qi.removeColumn("Tickets","lid");
    if (await hasColumn("Contacts","jid")) await qi.removeColumn("Contacts","jid");
    if (await hasColumn("Contacts","lid")) await qi.removeColumn("Contacts","lid");
  }
};
