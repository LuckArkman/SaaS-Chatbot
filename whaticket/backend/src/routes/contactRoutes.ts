// backend/src/routes/contactRoutes.ts

import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as ContactController from "../controllers/ContactController";
import * as ImportPhoneContactsController from "../controllers/ImportPhoneContactsController";

const contactRoutes = express.Router();
const upload = multer(uploadConfig);

// Importar contatos do celular
contactRoutes.post(
  "/contacts/import",
  isAuth,
  ImportPhoneContactsController.store
);

// Importar contatos via XLS
contactRoutes.post(
  "/contactsImport",
  isAuth,
  ContactController.importXls
);

// LISTA PAGINADA PADRÃO (/contacts?searchParam=&pageNumber=...)
contactRoutes.get(
  "/contacts",
  isAuth,
  ContactController.index
);

// Lista simples para selects (/contacts/list)
contactRoutes.get(
  "/contacts/list",
  isAuth,
  ContactController.list
);

// (opcional) lista filtrada só whatsapp – se quiser ativar depois
// contactRoutes.get(
//   "/contacts/list-whatsapp",
//   isAuth,
//   ContactController.listWhatsapp
// );

// VCard do contato (usa query ?name=&number=)
// IMPORTANTE: precisa vir ANTES de "/contacts/:contactId"
contactRoutes.get(
  "/contacts/vcard",
  isAuth,
  ContactController.getContactVcard
);

// Foto de perfil do contato no WhatsApp
// Também precisa vir ANTES de "/contacts/:contactId"
contactRoutes.get(
  "/contacts/profile/:number",
  isAuth,
  ContactController.getContactProfileURL
);

// Mostrar um contato por ID
contactRoutes.get(
  "/contacts/:contactId",
  isAuth,
  ContactController.show
);

// Criar contato
contactRoutes.post(
  "/contacts",
  isAuth,
  ContactController.store
);

// Atualizar contato
contactRoutes.put(
  "/contacts/:contactId",
  isAuth,
  ContactController.update
);

// 🔥 DELEÇÃO EM MASSA – mantém ANTES da rota com :contactId
contactRoutes.delete(
  "/contacts/batch-delete",
  isAuth,
  ContactController.bulkRemove
);

// Deletar um único contato
contactRoutes.delete(
  "/contacts/:contactId",
  isAuth,
  ContactController.remove
);

// Toggle aceitar áudio
contactRoutes.put(
  "/contacts/toggleAcceptAudio/:contactId",
  isAuth,
  ContactController.toggleAcceptAudio
);

// Bloquear / desbloquear contato
contactRoutes.put(
  "/contacts/block/:contactId",
  isAuth,
  ContactController.blockUnblock
);

// Upload de planilha de contatos
contactRoutes.post(
  "/contacts/upload",
  isAuth,
  upload.array("file"),
  ContactController.upload
);

// Verificar se contato tem tags
contactRoutes.get(
  "/contactTags/:contactId",
  isAuth,
  ContactController.getContactTags
);

// Habilitar / desabilitar bot para contato
contactRoutes.put(
  "/contacts/toggleDisableBot/:contactId",
  isAuth,
  ContactController.toggleDisableBot
);

// Atualizar carteiras (wallets) do contato
contactRoutes.put(
  "/contact-wallet/:contactId",
  isAuth,
  ContactController.updateContactWallet
);

export default contactRoutes;
