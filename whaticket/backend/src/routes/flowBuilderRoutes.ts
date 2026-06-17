import express from "express";
import isAuth from "../middleware/isAuth";

import multer from "multer";
import uploadConfig from "../config/uploadExt";

import * as FlowBuilderController from "../controllers/FlowBuilderController";
import FlowExportController from "../controllers/FlowExportController";
import FlowImportController from "../controllers/FlowImportController";

// NOVO: Importação para o controller de documentos que vamos criar.
import * as DocumentController from "../controllers/DocumentController";

const upload = multer(uploadConfig);
const uploadMemory = multer();

const flowBuilder = express.Router();

flowBuilder.post("/flowbuilder", isAuth, FlowBuilderController.createFlow);
flowBuilder.put("/flowbuilder", isAuth, FlowBuilderController.updateFlow);

flowBuilder.delete(
  "/flowbuilder/:idFlow",
  isAuth,
  FlowBuilderController.deleteFlow
);

flowBuilder.get("/flowbuilder", isAuth, FlowBuilderController.myFlows);
flowBuilder.get("/flowbuilder/:idFlow", isAuth, FlowBuilderController.flowOne);

flowBuilder.get(
  "/flowbuilder/export/:id",
  isAuth,
  FlowExportController
);

flowBuilder.post(
  "/flowbuilder/import",
  isAuth,
  uploadMemory.single("file"),
  FlowImportController
);

flowBuilder.post(
  "/flowbuilder/flow",
  isAuth,
  FlowBuilderController.FlowDataUpdate
);

flowBuilder.post(
  "/flowbuilder/duplicate",
  isAuth,
  FlowBuilderController.FlowDuplicate
);

flowBuilder.get(
  "/flowbuilder/flow/:idFlow",
  isAuth,
  FlowBuilderController.FlowDataGetOne
);

flowBuilder.post(
  "/flowbuilder/img",
  isAuth,
  upload.array("medias"),
  FlowBuilderController.FlowUploadImg
);

flowBuilder.post(
  "/flowbuilder/audio",
  isAuth,
  upload.array("medias"),
  FlowBuilderController.FlowUploadAudio
);

flowBuilder.post(
  "/flowbuilder/content",
  isAuth,
  upload.array("medias"),
  FlowBuilderController.FlowUploadAll
);

// ------------------- NOVA ROTA ADICIONADA -------------------
// Rota dedicada e limpa para receber e enviar documentos.
flowBuilder.post(
  "/flow/send-document",      // Endpoint específico
  isAuth,                     // Middleware de autenticação
  upload.single("document"),  // Espera um único arquivo chamado "document"
  DocumentController.send     // Chama a função 'send' do nosso novo controller
);
// -------------------------------------------------------------

export default flowBuilder;