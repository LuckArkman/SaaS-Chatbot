import { Router } from "express";
import isAuth from "../middleware/isAuth";
import AutoImportContactsController from "../controllers/AutoImportContactsController";

const autoImportContactsRoutes = Router();

/**
 * POST /companies/:companyId/contacts/import-auto
 * Dispara a importação automática (Baileys + fallback de agenda).
 * Protegido por isAuth.
 */
autoImportContactsRoutes.post(
  "/companies/:companyId/contacts/import-auto",
  isAuth,
  async (req, res, next) => {
    try {
      await AutoImportContactsController.importAuto(req, res);
    } catch (err) {
      next(err);
    }
  }
);

export default autoImportContactsRoutes;
