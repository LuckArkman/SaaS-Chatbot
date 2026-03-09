import os
import shutil
from fastapi import UploadFile
from typing import Optional
from loguru import logger
import uuid

class StorageService:
    """
    Gerenciador de Arquivos e Mídias (Imagens, Áudios, PDFs).
    Substitui o 'BlobStorageService' do .NET que usava Azure/S3.
    """
    UPLOAD_DIR = "uploads"
    
    @staticmethod
    def ensure_upload_dir():
        if not os.path.exists(StorageService.UPLOAD_DIR):
            os.makedirs(StorageService.UPLOAD_DIR)
            logger.info(f"📂 Diretório de uploads criado: {StorageService.UPLOAD_DIR}")

    @staticmethod
    async def save_upload(file: UploadFile, tenant_id: str) -> str:
        """Salva um arquivo enviado pelo UI (Agente) para o bot."""
        StorageService.ensure_upload_dir()
        
        # Estrutura por Tenant para isolamento físico
        tenant_path = os.path.join(StorageService.UPLOAD_DIR, tenant_id)
        if not os.path.exists(tenant_path):
            os.makedirs(tenant_path)
            
        filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(tenant_path, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return file_path

    @staticmethod
    def get_public_url(file_path: str) -> str:
        """Retorna a URL pública para acesso externo (Bot/Venom)."""
        # Em dev: http://localhost:8000/uploads/tenant_1/file.jpg
        clean_path = file_path.replace('\\', '/')
        return f"/{clean_path}"
