import { Router } from "express";
import multer from "multer";

import isAuth from "../middleware/isAuth";
import * as GlobalConfigController from "../controllers/GlobalConfigController";
import uploadConfig from "../config/upload";

const globalConfigRoutes = Router();
const upload = multer(uploadConfig);

// 🔹 ROTA PÚBLICA: /global-config/public-branding
globalConfigRoutes.get(
  "/public-branding",
  GlobalConfigController.publicBranding
);

// GET /global-config (pro painel, protegida)
globalConfigRoutes.get(
  "/",
  isAuth,
  GlobalConfigController.index 
);

// PUT /global-config (pro painel, protegida)
globalConfigRoutes.put(
  "/",
  isAuth,
  GlobalConfigController.update
);

// POST /global-config/upload  (upload de logo/capa do login)
globalConfigRoutes.post(
  "/upload",
  isAuth,
  upload.single("file"),
  GlobalConfigController.uploadBrandingImage
);

export default globalConfigRoutes;
