const { Contact, Tag } = require('../models/sql/models');
const { Op } = require('sequelize');
const phoneUtils = require('../utils/phoneUtils');

const listContacts = async (req, res) => {
  const { page = 1, limit = 50, search = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    const whereClause = search ? {
      [Op.or]: [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } }
      ]
    } : {};

    const { count, rows } = await Contact.findAndCountAll({
      where: whereClause,
      include: [{ model: Tag, as: 'Tags', through: { attributes: [] } }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return res.json({ total: count, page: parseInt(page), data: rows });
  } catch (e) {
    return res.status(500).json({ detail: 'Error listing contacts' });
  }
};

const createContact = async (req, res) => {
  const { phone_number, full_name, tag_ids = [] } = req.body;
  try {
    const normalizedPhone = phoneUtils.normalizeToDb(phone_number);
    const contact = await Contact.create({ phone_number: normalizedPhone, full_name });
    if (tag_ids.length > 0) {
      await contact.addTags(tag_ids);
    }
    return res.status(201).json(contact);
  } catch (e) {
    return res.status(400).json({ detail: 'Error creating contact' });
  }
};

const updateContact = async (req, res) => {
  const { id } = req.params;
  const { phone_number, full_name, is_blacklisted, tag_ids } = req.body;
  try {
    const contact = await Contact.findByPk(id);
    if (!contact) return res.status(404).json({ detail: 'Contact not found' });

    const normalizedPhone = phone_number ? phoneUtils.normalizeToDb(phone_number) : contact.phone_number;
    await contact.update({ phone_number: normalizedPhone, full_name, is_blacklisted });
    
    if (tag_ids !== undefined) {
      await contact.setTags(tag_ids);
    }
    
    return res.json(contact);
  } catch (e) {
    return res.status(400).json({ detail: 'Error updating contact' });
  }
};

const deleteContact = async (req, res) => {
  const { id } = req.params;
  try {
    const contact = await Contact.findByPk(id);
    if (!contact) return res.status(404).json({ detail: 'Contact not found' });
    
    await contact.destroy();
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ detail: 'Error deleting contact' });
  }
};

const whatsappCore = require('../services/whatsappCore');
const { WhatsAppInstance } = require('../models/sql/models');

const getActiveSessionName = async (tenantId) => {
  const instance = await WhatsAppInstance.findOne({ where: { tenant_id: tenantId } });
  if (!instance || instance.status !== 'CONNECTED') {
    throw new Error('Agente não está conectado ao WhatsApp. Conecte o bot primeiro.');
  }
  return instance.session_name;
};

const listWhatsappContacts = async (req, res) => {
  try {
    const sessionName = await getActiveSessionName(req.user.tenant_id);
    const contacts = await whatsappCore.listContacts(sessionName);
    
    return res.json({
      success: true,
      total: contacts.length,
      contacts: contacts
    });
  } catch (e) {
    return res.status(409).json({ success: false, detail: e.message });
  }
};

const addWhatsappContact = async (req, res) => {
  const { phone, name } = req.body;
  
  if (!phone) {
    return res.status(400).json({ success: false, detail: 'O número de telefone é obrigatório' });
  }

  try {
    const sessionName = await getActiveSessionName(req.user.tenant_id);
    
    // 1. Verifica se o número existe no WhatsApp (Baileys onWhatsApp)
    const whatsappCheck = await whatsappCore.verifyContact(sessionName, phone);
    if (!whatsappCheck || !whatsappCheck.exists) {
      return res.status(400).json({ success: false, detail: 'O número informado não possui conta ativa no WhatsApp.' });
    }

    // 2. Persiste no banco de dados local do Tenant
    const [dbContact, created] = await Contact.findOrCreate({
      where: { tenant_id: req.user.tenant_id, phone_number: phone },
      defaults: { full_name: name || `WhatsApp ${phone.slice(-4)}` }
    });

    if (!created && name) {
      await dbContact.update({ full_name: name });
    }

    return res.status(201).json({
      success: true,
      contact: {
        jid: whatsappCheck.jid,
        exists: whatsappCheck.exists
      },
      persisted: dbContact
    });

  } catch (e) {
    return res.status(409).json({ success: false, detail: e.message });
  }
};

module.exports = { listContacts, createContact, updateContact, deleteContact, listWhatsappContacts, addWhatsappContact };
