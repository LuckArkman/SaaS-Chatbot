const multer = require('multer');
const StorageService = require('../services/storageService');
const logger = require('../utils/logger');

// Configuração do multer na memória (buffer) para salvar via StorageService
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // Limite de 50MB por arquivo
  }
});

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Contexto de tenant ausente ou não autenticado.' });
    }
    
    logger.info(`[Storage] Recebido arquivo para upload: ${req.file.originalname} | Tamanho: ${req.file.size} bytes | Tenant: ${tenantId}`);
    
    // Salva o arquivo no disco local
    const filePath = await StorageService.saveUpload(
      req.file.buffer,
      req.file.originalname,
      tenantId
    );

    // Obtém o link público
    const publicUrl = StorageService.getPublicUrl(filePath);

    logger.info(`[Storage] Upload concluído com sucesso: ${publicUrl}`);

    return res.status(201).json({
      success: true,
      url: publicUrl,
      fileName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

  } catch (e) {
    logger.error(`[Storage] Falha no upload do arquivo: ${e.message}`);
    return res.status(500).json({ error: 'Erro interno ao realizar upload do arquivo.' });
  }
};

module.exports = {
  upload,
  uploadFile
};
