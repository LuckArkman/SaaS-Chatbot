const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class StorageService {
  static UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

  static ensureUploadDir() {
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
      logger.info(`📂 Diretório de uploads criado: ${this.UPLOAD_DIR}`);
    }
  }

  static async saveUpload(fileBuffer, originalName, tenantId) {
    this.ensureUploadDir();

    const tenantPath = path.join(this.UPLOAD_DIR, tenantId);
    if (!fs.existsSync(tenantPath)) {
      fs.mkdirSync(tenantPath, { recursive: true });
    }

    const filename = `${uuidv4()}_${originalName}`;
    const filePath = path.join(tenantPath, filename);

    fs.writeFileSync(filePath, fileBuffer);
    return filePath;
  }

  static getPublicUrl(filePath) {
    // Normaliza para URLs web
    const relativePath = path.relative(path.join(__dirname, '..', '..'), filePath);
    const cleanPath = relativePath.split(path.sep).join('/');
    return `/${cleanPath}`;
  }
}

module.exports = StorageService;
